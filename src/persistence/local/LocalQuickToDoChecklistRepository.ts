import { db, QUICK_TO_DO_CHECKLIST_ROW_ID } from './flowfocus.db';
import QuickToDoChecklistItem from '../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { QuickToDoChecklistRepository } from '../QuickToDoChecklistRepository';

export class LocalQuickToDoChecklistRepository implements QuickToDoChecklistRepository {
	async getItems(): Promise<QuickToDoChecklistItem[]> {
		const row = await db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID);
		return row?.items ?? [];
	}

	async save(items: QuickToDoChecklistItem[]): Promise<void> {
		await db.quickToDoChecklist.put({
			id: QUICK_TO_DO_CHECKLIST_ROW_ID,
			items,
			updatedAt: new Date().toISOString(),
			isSynced: false,
		});
	}
}

export const localQuickToDoChecklistRepository = new LocalQuickToDoChecklistRepository();
