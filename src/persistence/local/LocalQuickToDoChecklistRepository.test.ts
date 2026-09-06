import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db/flowfocus.db';
import { LocalQuickToDoChecklistRepository } from './LocalQuickToDoChecklistRepository';
import QuickToDoChecklistItem from '../../model/quickToDoChecklist/QuickToDoChecklistItem';

const repository = new LocalQuickToDoChecklistRepository();

const sampleItems: QuickToDoChecklistItem[] = [
	{ id: 'item-1', text: 'Buy milk', isChecked: false, children: [] },
];

beforeEach(async () => {
	await db.delete();
	await db.open();
});

it('returns an empty list before anything has been saved', async () => {
	expect(await repository.getItems()).toEqual([]);
});

it('returns the saved items after saving them', async () => {
	await repository.save(sampleItems);

	expect(await repository.getItems()).toEqual(sampleItems);
});
