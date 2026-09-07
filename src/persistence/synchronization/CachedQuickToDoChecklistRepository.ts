import QuickToDoChecklistItem from '../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { FlowFocusDB, QUICK_TO_DO_CHECKLIST_ROW_ID } from '../local/flowfocus.db';
import { QuickToDoChecklistRepository } from '../QuickToDoChecklistRepository';
import { openUserCacheDatabase } from './perUserCache';
import { LocalWriteSyncTrigger } from './CachedTaskRepository';

export class CachedQuickToDoChecklistRepository implements QuickToDoChecklistRepository {
	private readonly db: FlowFocusDB;

	constructor(userID: string, private readonly syncTrigger: LocalWriteSyncTrigger) {
		this.db = openUserCacheDatabase(userID);
	}

	async getItems(): Promise<QuickToDoChecklistItem[]> {
		const row = await this.db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID);
		return row?.items ?? [];
	}

	async save(items: QuickToDoChecklistItem[]): Promise<void> {
		await this.db.quickToDoChecklist.put({
			id: QUICK_TO_DO_CHECKLIST_ROW_ID,
			items,
			updatedAt: new Date().toISOString(),
			isSynced: false,
		});
		this.notifyLocalWrite();
	}

	private notifyLocalWrite(): void {
		try {
			this.syncTrigger.notifyLocalWrite();
		} catch (error) {
			console.error('Sync trigger failed after a local checklist write', error);
		}
	}
}
