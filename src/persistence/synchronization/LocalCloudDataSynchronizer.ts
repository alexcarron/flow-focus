import { FlowFocusDB, PlainTaskRow, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID, SYNC_STATUS_ROW_ID } from '../local/flowfocus.db';
import { SupabaseDataService } from '../cloud/supabaseDataService';

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
	onSyncStatusChange?: (status: SyncStatusSnapshot) => void;
	isOnline?: () => boolean;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class LocalCloudDataSynchronizer {
	private readonly cacheDB: FlowFocusDB;
	private readonly cloudDataService: SupabaseDataService;
	private readonly onTasksChanged: () => void;
	private readonly onSettingsChanged: () => void;
	private readonly onChecklistChanged: () => void;
	private readonly onSyncStatusChange: (status: SyncStatusSnapshot) => void;
	private readonly isOnline: () => boolean;

	private started = false;
	private syncInProgress: Promise<void> | null = null;
	private hasUnsyncedChanges = false;

	constructor(dependencies: LocalCloudDataSynchronizerDependencies) {
		this.cacheDB = dependencies.cacheDB;
		this.cloudDataService = dependencies.cloudDataService;
		this.onTasksChanged = dependencies.onTasksChanged ?? (() => {});
		this.onSettingsChanged = dependencies.onSettingsChanged ?? (() => {});
		this.onChecklistChanged = dependencies.onChecklistChanged ?? (() => {});
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
		void this.sync();
	}

	stop(): void {
		if (!this.started) return;
		this.started = false;
		window.removeEventListener('online', this.handleOnline);
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
	}

	notifyLocalWrite(): void {
		if (this.isOnline()) void this.sync();
	}

	sync(): Promise<void> {
		if (!this.syncInProgress) {
			this.syncInProgress = this.runSyncPass().finally(() => {
				this.syncInProgress = null;
			});
		}
		return this.syncInProgress;
	}

	private handleOnline(): void {
		void this.sync();
	}

	private handleVisibilityChange(): void {
		if (document.visibilityState === 'visible') void this.sync();
	}

	private reportStatus(status: SyncStatusSnapshot): void {
		this.onSyncStatusChange(status);
	}

	private async runSyncPass(): Promise<void> {
		this.reportStatus({ isSyncing: true, lastSyncError: null, hasUnsyncedChanges: this.hasUnsyncedChanges });

		const pushError = await this.pushPendingChanges();
		const pullError = await this.pullRemoteChanges();
		const lastSyncError = pushError ?? pullError;

		this.hasUnsyncedChanges = await this.computeHasUnsyncedChanges();
		this.reportStatus({ isSyncing: false, lastSyncError, hasUnsyncedChanges: this.hasUnsyncedChanges });
	}

	private async pushPendingChanges(): Promise<string | null> {
		const [taskPushError, settingsPushError, checklistPushError] = await Promise.all([
			this.pushNotSyncedTasks(),
			this.pushSettingsIfNotSynced(),
			this.pushChecklistIfNotSynced(),
		]);
		return taskPushError ?? settingsPushError ?? checklistPushError;
	}

	private async pushNotSyncedTasks(): Promise<string | null> {
		const allTasks = await this.cacheDB.tasks.toArray();
		const notSyncedTasks = allTasks.filter(row => !row.isSynced);

		const results = await Promise.allSettled(notSyncedTasks.map(row => this.pushTask(row)));
		const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
		return firstFailure ? errorMessage(firstFailure.reason) : null;
	}

	private async pushTask(row: PlainTaskRow): Promise<void> {
		await this.cloudDataService.upsertTask(row);
		await this.cacheDB.tasks.update(row.id, { isSynced: true });
	}

	private async pushSettingsIfNotSynced(): Promise<string | null> {
		try {
			const row = await this.cacheDB.settings.get(SETTINGS_ROW_ID);
			if (!row || row.isSynced) return null;
			await this.cloudDataService.upsertSettings(row);
			await this.cacheDB.settings.update(SETTINGS_ROW_ID, { isSynced: true });
			return null;
		} catch (error) {
			return errorMessage(error);
		}
	}

	private async pushChecklistIfNotSynced(): Promise<string | null> {
		try {
			const row = await this.cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID);
			if (!row || row.isSynced) return null;
			await this.cloudDataService.upsertChecklist(row);
			await this.cacheDB.quickToDoChecklist.put({ ...row, isSynced: true });
			return null;
		} catch (error) {
			return errorMessage(error);
		}
	}

	private async pullRemoteChanges(): Promise<string | null> {
		const [tasksError, settingsError, checklistError] = await Promise.all([
			this.pullTasks(),
			this.pullSettings(),
			this.pullChecklist(),
		]);
		return tasksError ?? settingsError ?? checklistError;
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

			await this.cacheDB.syncStatus.put({ id: SYNC_STATUS_ROW_ID, timeLastSyncedTasksAt: newestUpdatedAt });

			if (anyTaskChanged) this.onTasksChanged();
			return null;
		} catch (error) {
			return errorMessage(error);
		}
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
			return errorMessage(error);
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
			return errorMessage(error);
		}
	}

	private async computeHasUnsyncedChanges(): Promise<boolean> {
		const [unsyncedTaskCount, settingsRow, checklistRow] = await Promise.all([
			this.cacheDB.tasks.filter(row => !row.isSynced).count(),
			this.cacheDB.settings.get(SETTINGS_ROW_ID),
			this.cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID),
		]);

		return unsyncedTaskCount > 0 || Boolean(settingsRow && !settingsRow.isSynced) || Boolean(checklistRow && !checklistRow.isSynced);
	}
}
