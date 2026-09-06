import QuickToDoChecklistItem from '../model/quickToDoChecklist/QuickToDoChecklistItem';

export interface QuickToDoChecklistRepository {
	getItems(): Promise<QuickToDoChecklistItem[]>;
	save(items: QuickToDoChecklistItem[]): Promise<void>;
}
