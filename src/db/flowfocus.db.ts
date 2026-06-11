import Dexie, { Table } from 'dexie';
import { AppSettings } from '../model/AppSettings';

export interface PlainTaskRow {
  id?: number;
  description: string;
  stepsToStatusMap: Array<[string, string]>;
  startTime: string | null;
  endTime: string | null;
  deadline: string | null;
  minRequiredTime: number | null;
  maxRequiredTime: number | null;
  repeatInterval: number | null;
  isMandatory: boolean;
  isComplete: boolean;
  isSkipped: boolean;
  lastActionedStep: { step: string; status: string } | null;
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
  }
}

export const db = new FlowFocusDB();
