import Dexie, { Table } from 'dexie';
import { AppSettings } from '../model/AppSettings';

export interface PlainStepRow {
	id: string;
	text: string;
	status: string;
}

export interface PlainTaskRow {
	id?: number;
	description: string;
	steps: PlainStepRow[];
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	isMandatory: boolean;
	isComplete: boolean;
	isSkipped: boolean;
	lastActionedStep: { stepID: string; status: string } | null;
}

export interface SettingsRow extends AppSettings {
	id: number;
}

export class FlowFocusDB extends Dexie {
	tasks!: Table<PlainTaskRow, number>;
	settings!: Table<SettingsRow, number>;

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
	}
}

export const db = new FlowFocusDB();
