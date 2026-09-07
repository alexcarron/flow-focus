import { db, SETTINGS_ROW_ID } from './flowfocus.db';
import { AppSettings } from '../../model/AppSettings';
import { SettingsRepository } from '../SettingsRepository';

export class LocalSettingsRepository implements SettingsRepository {
	async get(): Promise<AppSettings | undefined> {
		return await db.settings.get(SETTINGS_ROW_ID);
	}

	async save(settings: AppSettings): Promise<void> {
		await db.settings.put({
			id: SETTINGS_ROW_ID,
			...settings,
			updatedAt: new Date().toISOString(),
			isSynced: false,
		});
	}
}

export const localSettingsRepository = new LocalSettingsRepository();
