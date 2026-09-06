import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/flowfocus.db';
import { useQuickToDoChecklistStore } from './quickToDoChecklistStore';

beforeEach(async () => {
	await db.delete();
	await db.open();
	useQuickToDoChecklistStore.setState({ items: [], isLoaded: false });
});

async function reload(): Promise<void> {
	await useQuickToDoChecklistStore.getState().loadQuickToDoChecklist();
}

describe('adding an item', () => {
	it('is there after reloading', async () => {
		useQuickToDoChecklistStore.getState().addTopLevelItem('Buy milk');

		await reload();

		const items = useQuickToDoChecklistStore.getState().items;
		expect(items).toHaveLength(1);
		expect(items[0].text).toBe('Buy milk');
	});
});

describe('editing an item', () => {
	it('keeps the edit after reloading', async () => {
		const itemID = useQuickToDoChecklistStore.getState().addTopLevelItem('Buy milk');

		useQuickToDoChecklistStore.getState().editItemText(itemID, 'Buy oat milk');
		await reload();

		expect(useQuickToDoChecklistStore.getState().items[0].text).toBe('Buy oat milk');
	});
});

describe('checking an item', () => {
	it('keeps the checked state after reloading', async () => {
		const itemID = useQuickToDoChecklistStore.getState().addTopLevelItem('Buy milk');

		useQuickToDoChecklistStore.getState().toggleItemChecked(itemID);
		await reload();

		expect(useQuickToDoChecklistStore.getState().items[0].isChecked).toBe(true);
	});
});

describe('deleting an item', () => {
	it('is gone after reloading', async () => {
		const itemID = useQuickToDoChecklistStore.getState().addTopLevelItem('Buy milk');

		useQuickToDoChecklistStore.getState().deleteItem(itemID);
		await reload();

		expect(useQuickToDoChecklistStore.getState().items).toHaveLength(0);
	});
});
