import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../persistence/local/flowfocus.db';
import { DEFAULT_SETTINGS } from '../model/AppSettings';
import { useSettingsStore } from './settingsStore';
import { tasksManager } from './tasksStore';

beforeEach(async () => {
	await db.delete();
	await db.open();
});

describe('loading settings for the first time', () => {
	it('falls back to the default settings and persists them', async () => {
		await useSettingsStore.getState().loadSettings();

		const state = useSettingsStore.getState();
		expect(state.morningTime).toBe(DEFAULT_SETTINGS.morningTime);

		const persisted = await db.settings.get(1);
		expect(persisted?.morningTime).toBe(DEFAULT_SETTINGS.morningTime);
	});
});

describe('changing a setting', () => {
	it('is there after reloading', async () => {
		await useSettingsStore.getState().loadSettings();

		await useSettingsStore.getState().setBedtime('01:00');
		await useSettingsStore.getState().loadSettings();

		expect(useSettingsStore.getState().bedtime).toBe('01:00');
	});
});

describe('ignoring the sleep schedule', () => {
	it('removes the asleep time window, and brings it back when no longer ignored', async () => {
		await useSettingsStore.getState().loadSettings();

		await useSettingsStore.getState().setShouldIgnoreSleepSchedule(true);
		expect(tasksManager.getAsleepTimeWindow()).toBeNull();

		await useSettingsStore.getState().setShouldIgnoreSleepSchedule(false);
		expect(tasksManager.getAsleepTimeWindow()).not.toBeNull();
	});
});
