import { db } from './flowfocus.db';
import QuickToDoChecklistItem from '../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { QuickToDoChecklistRepository } from '../QuickToDoChecklistRepository';

const QUICK_TO_DO_CHECKLIST_ID = 1;

export class LocalQuickToDoChecklistRepository implements QuickToDoChecklistRepository {
	async getItems(): Promise<QuickToDoChecklistItem[]> {
		const row = await db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ID);
		return row?.items ?? [];
	}

	async save(items: QuickToDoChecklistItem[]): Promise<void> {
		await db.quickToDoChecklist.put({
			id: QUICK_TO_DO_CHECKLIST_ID,
			items,
			updatedAt: new Date().toISOString(),
			isSynced: false,
		});
	}
}

export const localQuickToDoChecklistRepository = new LocalQuickToDoChecklistRepository();
