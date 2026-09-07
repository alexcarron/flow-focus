import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './flowfocus.db';
import { LocalSettingsRepository } from './LocalSettingsRepository';
import { DEFAULT_SETTINGS } from '../../model/AppSettings';

const repository = new LocalSettingsRepository();

beforeEach(async () => {
	await db.delete();
	await db.open();
});

it('returns undefined before anything has been saved', async () => {
	expect(await repository.get()).toBeUndefined();
});

it('returns the saved settings after saving them', async () => {
	await repository.save(DEFAULT_SETTINGS);

	expect(await repository.get()).toMatchObject(DEFAULT_SETTINGS);
});

it('stamps updatedAt and marks the row unsynced on save', async () => {
	await repository.save(DEFAULT_SETTINGS);

	const row = await db.settings.get(1);

	expect(typeof row?.updatedAt).toBe('string');
	expect(row?.isSynced).toBe(false);
});
