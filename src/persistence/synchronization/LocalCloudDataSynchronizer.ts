import { Table, UpdateSpec } from 'dexie';
import { FlowFocusDB, PlainTaskRow, TagRow, SyncStatusRow, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID, SYNC_STATUS_ROW_ID } from '../local/flowfocus.db';
import { SupabaseDataService } from '../cloud/supabaseDataService';
import { hasUnsyncedCachedChanges } from './perUserCache';
import { toErrorMessage } from '../../utilities/errorMessage';
import { RunOnceThenAgainIfChanged } from '../../utilities/runOnceThenAgainIfChanged';

const SYNC_INTERVAL_WHEN_VISIBLE_MS = 60_000;
const SYNC_INTERVAL_WHEN_HIDDEN_MS = 600_000;

export interface SyncStatusSnapshot {
	isSyncing: boolean;
	lastSyncError: string | null;
	hasUnsyncedChanges: boolean;
}

export interface LocalCloudDataSynchronizerDependencies {
	cacheDB: FlowFocusDB;
	cloudDataService: SupabaseDataService;
	onTasksChanged?: () => void;
	onSettingsChanged?: () => void;
	onChecklistChanged?: () => void;
	onTagsChanged?: () => void;
	onSyncStatusChange?: (status: SyncStatusSnapshot) => void;
	isOnline?: () => boolean;
}

export class LocalCloudDataSynchronizer {
	private readonly cacheDB: FlowFocusDB;
	private readonly cloudDataService: SupabaseDataService;
	private readonly onTasksChanged: () => void;
	private readonly onSettingsChanged: () => void;
	private readonly onChecklistChanged: () => void;
	private readonly onTagsChanged: () => void;
	private readonly onSyncStatusChange: (status: SyncStatusSnapshot) => void;
	private readonly isOnline: () => boolean;

	private started = false;
	private readonly syncRunner = new RunOnceThenAgainIfChanged();
	private hasUnsyncedChanges = false;
	private syncTickIntervalID: ReturnType<typeof setInterval> | undefined;

	constructor(dependencies: LocalCloudDataSynchronizerDependencies) {
		this.cacheDB = dependencies.cacheDB;
		this.cloudDataService = dependencies.cloudDataService;
		this.onTasksChanged = dependencies.onTasksChanged ?? (() => {});
		this.onSettingsChanged = dependencies.onSettingsChanged ?? (() => {});
		this.onChecklistChanged = dependencies.onChecklistChanged ?? (() => {});
		this.onTagsChanged = dependencies.onTagsChanged ?? (() => {});
		this.onSyncStatusChange = dependencies.onSyncStatusChange ?? (() => {});
		this.isOnline = dependencies.isOnline ?? (() => navigator.onLine);

		this.handleOnline = this.handleOnline.bind(this);
		this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
	}

	start(): void {
		if (this.started) return;
		this.started = true;
		window.addEventListener('online', this.handleOnline);
		document.addEventListener('visibilitychange', this.handleVisibilityChange);
		this.startSyncTick();
		void this.sync();
	}

	stop(): void {
		if (!this.started) return;
		this.started = false;
		window.removeEventListener('online', this.handleOnline);
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		this.stopSyncTick();
	}

	notifyLocalWrite(): void {
		if (this.isOnline()) void this.sync();
	}

	sync(): Promise<void> {
		return this.syncRunner.run(() => this.runSyncPass());
	}

	private handleOnline(): void {
		void this.sync();
	}

	private handleVisibilityChange(): void {
		this.startSyncTick();
		if (document.visibilityState === 'visible') void this.sync();
	}

	private startSyncTick(): void {
		this.stopSyncTick();
		const intervalMs = document.visibilityState === 'visible'
			? SYNC_INTERVAL_WHEN_VISIBLE_MS
			: SYNC_INTERVAL_WHEN_HIDDEN_MS;
		this.syncTickIntervalID = setInterval(() => void this.sync(), intervalMs);
	}

	private stopSyncTick(): void {
		if (this.syncTickIntervalID === undefined) return;
		clearInterval(this.syncTickIntervalID);
		this.syncTickIntervalID = undefined;
	}

	private reportStatus(status: SyncStatusSnapshot): void {
		this.onSyncStatusChange(status);
	}

	private async runSyncPass(): Promise<void> {
		this.reportStatus({ isSyncing: true, lastSyncError: null, hasUnsyncedChanges: this.hasUnsyncedChanges });

		let lastSyncError: string | null = null;
		try {
			const pushError = await this.pushPendingChanges();
			const pullError = await this.pullRemoteChanges();
			lastSyncError = pushError ?? pullError;
			this.hasUnsyncedChanges = await this.computeHasUnsyncedChanges();
		} catch (error) {
			lastSyncError = toErrorMessage(error);
		}

		this.reportStatus({ isSyncing: false, lastSyncError, hasUnsyncedChanges: this.hasUnsyncedChanges });
	}

	private async pushPendingChanges(): Promise<string | null> {
		const [taskPushError, settingsPushError, checklistPushError, tagPushError] = await Promise.all([
			this.pushNotSyncedTasks(),
			this.pushSettingsIfNotSynced(),
			this.pushChecklistIfNotSynced(),
			this.pushNotSyncedTags(),
		]);
		return taskPushError ?? settingsPushError ?? checklistPushError ?? tagPushError;
	}

	private async pushNotSyncedTasks(): Promise<string | null> {
		try {
			const allTasks = await this.cacheDB.tasks.toArray();
			const notSyncedTasks = allTasks.filter(row => !row.isSynced);

			const results = await Promise.allSettled(notSyncedTasks.map(row => this.pushTask(row)));
			const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
			return firstFailure ? toErrorMessage(firstFailure.reason) : null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async pushTask(row: PlainTaskRow): Promise<void> {
		await this.cloudDataService.upsertTask(row);
		await this.markSyncedIfRowUnchangedSincePush(this.cacheDB.tasks, row.id, row.updatedAt);
	}

	private async pushNotSyncedTags(): Promise<string | null> {
		try {
			const allTags = await this.cacheDB.tags.toArray();
			const notSyncedTags = allTags.filter(row => !row.isSynced);

			const results = await Promise.allSettled(notSyncedTags.map(row => this.pushTag(row)));
			const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
			return firstFailure ? toErrorMessage(firstFailure.reason) : null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async pushTag(row: TagRow): Promise<void> {
		await this.cloudDataService.upsertTag(row);
		await this.markSyncedIfRowUnchangedSincePush(this.cacheDB.tags, row.id, row.updatedAt);
	}

	private async pushSettingsIfNotSynced(): Promise<string | null> {
		try {
			const row = await this.cacheDB.settings.get(SETTINGS_ROW_ID);
			if (!row || row.isSynced) return null;
			await this.cloudDataService.upsertSettings(row);
			await this.markSyncedIfRowUnchangedSincePush(this.cacheDB.settings, SETTINGS_ROW_ID, row.updatedAt);
			return null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async pushChecklistIfNotSynced(): Promise<string | null> {
		try {
			const row = await this.cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID);
			if (!row || row.isSynced) return null;
			await this.cloudDataService.upsertChecklist(row);
			await this.markSyncedIfRowUnchangedSincePush(this.cacheDB.quickToDoChecklist, QUICK_TO_DO_CHECKLIST_ROW_ID, row.updatedAt);
			return null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async markSyncedIfRowUnchangedSincePush<TRow extends { updatedAt: string; isSynced: boolean }, TKey>(
		table: Table<TRow, TKey>,
		key: TKey,
		updatedAtAtTimeOfPush: string,
	): Promise<void> {
		const currentRow = await table.get(key);
		if (currentRow && currentRow.updatedAt === updatedAtAtTimeOfPush) {
			await table.update(key, { isSynced: true } as unknown as UpdateSpec<TRow>);
		}
	}

	private async pullRemoteChanges(): Promise<string | null> {
		const [tasksError, settingsError, checklistError, tagsError] = await Promise.all([
			this.pullTasks(),
			this.pullSettings(),
			this.pullChecklist(),
			this.pullTags(),
		]);
		return tasksError ?? settingsError ?? checklistError ?? tagsError;
	}

	private async pullTasks(): Promise<string | null> {
		try {
			const syncStatusRow = await this.cacheDB.syncStatus.get(SYNC_STATUS_ROW_ID);
			const sinceUpdatedAt = syncStatusRow?.timeLastSyncedTasksAt ?? undefined;

			const pulledTasks = await this.cloudDataService.pullTasks(sinceUpdatedAt);
			if (pulledTasks.length === 0) return null;

			let anyTaskChanged = false;
			let newestUpdatedAt = sinceUpdatedAt ?? pulledTasks[0].updatedAt;

			for (const pulledTask of pulledTasks) {
				if (Date.parse(pulledTask.updatedAt) > Date.parse(newestUpdatedAt)) {
					newestUpdatedAt = pulledTask.updatedAt;
				}

				const localTask = await this.cacheDB.tasks.get(pulledTask.id);
				if (!localTask || Date.parse(pulledTask.updatedAt) > Date.parse(localTask.updatedAt)) {
					await this.cacheDB.tasks.put(pulledTask);
					anyTaskChanged = true;
				}
			}

			await this.putSyncStatus({ timeLastSyncedTasksAt: newestUpdatedAt });

			if (anyTaskChanged) this.onTasksChanged();
			return null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async pullTags(): Promise<string | null> {
		try {
			const syncStatusRow = await this.cacheDB.syncStatus.get(SYNC_STATUS_ROW_ID);
			const sinceUpdatedAt = syncStatusRow?.timeLastSyncedTagsAt ?? undefined;

			const pulledTags = await this.cloudDataService.pullTags(sinceUpdatedAt);
			if (pulledTags.length === 0) return null;

			let anyTagChanged = false;
			let newestUpdatedAt = sinceUpdatedAt ?? pulledTags[0].updatedAt;

			for (const pulledTag of pulledTags) {
				if (Date.parse(pulledTag.updatedAt) > Date.parse(newestUpdatedAt)) {
					newestUpdatedAt = pulledTag.updatedAt;
				}

				const localTag = await this.cacheDB.tags.get(pulledTag.id);
				if (!localTag || Date.parse(pulledTag.updatedAt) > Date.parse(localTag.updatedAt)) {
					await this.cacheDB.tags.put(pulledTag);
					anyTagChanged = true;
				}
			}

			await this.putSyncStatus({ timeLastSyncedTagsAt: newestUpdatedAt });

			if (anyTagChanged) this.onTagsChanged();
			return null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async putSyncStatus(update: Partial<Pick<SyncStatusRow, 'timeLastSyncedTasksAt' | 'timeLastSyncedTagsAt'>>): Promise<void> {
		const existingRow = await this.cacheDB.syncStatus.get(SYNC_STATUS_ROW_ID);
		await this.cacheDB.syncStatus.put({
			id: SYNC_STATUS_ROW_ID,
			timeLastSyncedTasksAt: existingRow?.timeLastSyncedTasksAt ?? null,
			timeLastSyncedTagsAt: existingRow?.timeLastSyncedTagsAt ?? null,
			...update,
		});
	}

	private async pullSettings(): Promise<string | null> {
		try {
			const pulledSettings = await this.cloudDataService.pullSettings(SETTINGS_ROW_ID);
			if (!pulledSettings) return null;

			const localSettings = await this.cacheDB.settings.get(SETTINGS_ROW_ID);
			if (!localSettings || Date.parse(pulledSettings.updatedAt) > Date.parse(localSettings.updatedAt)) {
				await this.cacheDB.settings.put(pulledSettings);
				this.onSettingsChanged();
			}
			return null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async pullChecklist(): Promise<string | null> {
		try {
			const pulledChecklist = await this.cloudDataService.pullChecklist(QUICK_TO_DO_CHECKLIST_ROW_ID);
			if (!pulledChecklist) return null;

			const localChecklist = await this.cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID);
			if (!localChecklist || Date.parse(pulledChecklist.updatedAt) > Date.parse(localChecklist.updatedAt)) {
				await this.cacheDB.quickToDoChecklist.put(pulledChecklist);
				this.onChecklistChanged();
			}
			return null;
		} catch (error) {
			return toErrorMessage(error);
		}
	}

	private async computeHasUnsyncedChanges(): Promise<boolean> {
		return hasUnsyncedCachedChanges(this.cacheDB);
	}
}
