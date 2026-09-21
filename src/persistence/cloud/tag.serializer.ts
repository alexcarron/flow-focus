import { TagRow } from '../local/flowfocus.db';
import { fromCloudTimestamp, fromNullableCloudTimestamp, toCloudTimestamp, toNullableCloudTimestamp } from './cloudTimestamp';

export interface CloudTagRow {
	id: string;
	user_id: string;
	name: string;
	updated_at: string;
	deleted_at: string | null;
}

export function tagRowToCloudRow(row: TagRow, userID: string): CloudTagRow {
	return {
		id: row.id,
		user_id: userID,
		name: row.name,
		updated_at: toCloudTimestamp(fromCloudTimestamp(row.updatedAt)),
		deleted_at: toNullableCloudTimestamp(fromNullableCloudTimestamp(row.deletedAt)),
	};
}

export function cloudRowToTagRow(row: CloudTagRow): TagRow {
	return {
		id: row.id,
		name: row.name,
		updatedAt: toCloudTimestamp(fromCloudTimestamp(row.updated_at)),
		deletedAt: toNullableCloudTimestamp(fromNullableCloudTimestamp(row.deleted_at)),
		isSynced: true,
	};
}
