import Dexie, { Table } from 'dexie';
import { AppSettings } from '../model/AppSettings';
import QuickToDoChecklistItem from '../model/quickToDoChecklist/QuickToDoChecklistItem';

export interface PlainStepRow {
	id: string;
	text: string;
	status: string;
}

export interface PersistedRecordMetadata {
	updatedAt: string;
	isSynced: boolean;
}

export interface DeletableRecordMetadata extends PersistedRecordMetadata {
	deletedAt: string | null;
}

export interface PlainTaskRow extends DeletableRecordMetadata {
	id: string;
	description: string;
	steps: PlainStepRow[];
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	reccurenceStartTime: string | null;
	isMandatory: boolean;
	isComplete: boolean;
	isSkipped: boolean;
	lastActionedStep: { stepID: string; status: string } | null;
}

export interface SettingsRow extends AppSettings, PersistedRecordMetadata {
	id: number;
}

export interface QuickToDoChecklistRow extends PersistedRecordMetadata {
	id: number;
	items: QuickToDoChecklistItem[];
}

export class FlowFocusDB extends Dexie {
	tasks!: Table<PlainTaskRow, string>;
	settings!: Table<SettingsRow, number>;
	quickToDoChecklist!: Table<QuickToDoChecklistRow, number>;

	constructor() {
		super('FlowFocusDB');
		this.version(1).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
		});
		this.version(2).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
		});
		this.version(3).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
		}).upgrade(transaction => {
			return transaction.table('tasks').toCollection().modify(row => {
				const legacyStepsToStatusMap = row.stepsToStatusMap as Array<[string, string]> | undefined;
				const legacyLastActionedStep = row.lastActionedStep as { step: string; status: string } | null | undefined;

				const stepTextToNewID = new Map<string, string>();
				row.steps = (legacyStepsToStatusMap ?? []).map(([text, status]) => {
					const id = crypto.randomUUID();
					stepTextToNewID.set(text, id);
					return { id, text, status };
				});
				delete row.stepsToStatusMap;

				if (legacyLastActionedStep) {
					const stepID = stepTextToNewID.get(legacyLastActionedStep.step);
					row.lastActionedStep = stepID ? { stepID, status: legacyLastActionedStep.status } : null;
				}
			});
		});
		this.version(4).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
			checklist: 'id',
		});
		this.version(5).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
			checklist: 'id',
		}).upgrade(transaction => {
			return transaction.table('tasks').toCollection().modify(row => {
				row.reccurenceStartTime = row.repeatInterval !== null ? row.startTime : null;
			});
		});
		// Dexie cannot change a table's primary key within one version bump
		// (throws "Not yet support for changing primary key"), so the identity
		// migration stages rows through a differently-named table across two versions:
		// version 6 copies legacy auto-increment rows into `tasksWithIdentity`
		// (keyed by the new UUID `id`), then version 7 recreates `tasks` under
		// that same new schema and moves the staged rows back into it.
		this.version(6).stores({
			tasks: null,
			tasksWithIdentity: 'id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime, deletedAt, updatedAt',
			settings: 'id',
			checklist: null,
			quickToDoChecklist: 'id',
		}).upgrade(async transaction => {
			const now = new Date().toISOString();

			const legacyTaskRows = await transaction.table('tasks').toArray();
			await transaction.table('tasksWithIdentity').bulkAdd(legacyTaskRows.map(legacyRow => ({
				...legacyRow,
				id: crypto.randomUUID(),
				updatedAt: now,
				deletedAt: null,
				isSynced: false,
			})));

			await transaction.table('settings').toCollection().modify(row => {
				row.updatedAt = now;
				row.isSynced = false;
			});

			const legacyChecklistRows = await transaction.table('checklist').toArray();
			for (const legacyRow of legacyChecklistRows) {
				await transaction.table('quickToDoChecklist').add({
					...legacyRow,
					updatedAt: now,
					isSynced: false,
				});
			}
		});
		this.version(7).stores({
			tasks: 'id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime, deletedAt, updatedAt',
			tasksWithIdentity: null,
			settings: 'id',
			quickToDoChecklist: 'id',
		}).upgrade(async transaction => {
			const stagedTaskRows = await transaction.table('tasksWithIdentity').toArray();
			await transaction.table('tasks').bulkAdd(stagedTaskRows);
		});
	}
}

export const db = new FlowFocusDB();
