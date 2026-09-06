import QuickToDoChecklistItem from '../model/quickToDoChecklist/QuickToDoChecklistItem';
import { QuickToDoChecklistRow } from './flowfocus.db';
import { fromCloudTimestamp, toCloudTimestamp } from './cloudTimestamp';

export interface CloudChecklistRow {
	user_id: string;
	items: QuickToDoChecklistItem[];
	updated_at: string;
}

export function quickToDoChecklistRowToCloudRow(row: QuickToDoChecklistRow, userID: string): CloudChecklistRow {
	return {
		user_id: userID,
		items: row.items,
		updated_at: toCloudTimestamp(fromCloudTimestamp(row.updatedAt)),
	};
}

export function cloudRowToQuickToDoChecklistRow({ cloudRow, id }: { cloudRow: CloudChecklistRow; id: number }): QuickToDoChecklistRow {
	return {
		id,
		items: cloudRow.items,
		updatedAt: toCloudTimestamp(fromCloudTimestamp(cloudRow.updated_at)),
		isSynced: true,
	};
}
