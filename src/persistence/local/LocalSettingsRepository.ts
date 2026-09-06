import { db } from '../../db/flowfocus.db';
import { AppSettings } from '../../model/AppSettings';
import { SettingsRepository } from '../SettingsRepository';

const SETTINGS_ID = 1;

export class LocalSettingsRepository implements SettingsRepository {
	async get(): Promise<AppSettings | undefined> {
		return await db.settings.get(SETTINGS_ID);
	}

	async save(settings: AppSettings): Promise<void> {
		await db.settings.put({
			id: SETTINGS_ID,
			...settings,
			updatedAt: new Date().toISOString(),
			isSynced: false,
		});
	}
}

export const localSettingsRepository = new LocalSettingsRepository();
