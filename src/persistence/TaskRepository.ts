import { PlainTaskRow } from './local/flowfocus.db';

export type TaskWriteInput = Omit<PlainTaskRow, 'updatedAt' | 'deletedAt' | 'isSynced'>;

export interface TaskRepository {
	getAll(): Promise<PlainTaskRow[]>;
	save(record: TaskWriteInput): Promise<void>;
	softDelete(id: string): Promise<void>;
	clear(): Promise<void>;
}
