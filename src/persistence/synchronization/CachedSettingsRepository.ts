import { AppSettings } from '../../model/AppSettings';
import { FlowFocusDB, SETTINGS_ROW_ID } from '../local/flowfocus.db';
import { SettingsRepository } from '../SettingsRepository';
import { openUserCacheDatabase } from './perUserCache';
import { LocalWriteSyncTrigger } from './CachedTaskRepository';

export class CachedSettingsRepository implements SettingsRepository {
	private readonly db: FlowFocusDB;

	constructor(userID: string, private readonly syncTrigger: LocalWriteSyncTrigger) {
		this.db = openUserCacheDatabase(userID);
	}

	async get(): Promise<AppSettings | undefined> {
		return await this.db.settings.get(SETTINGS_ROW_ID);
	}

	async save(settings: AppSettings): Promise<void> {
		await this.db.settings.put({
			id: SETTINGS_ROW_ID,
			...settings,
			updatedAt: new Date().toISOString(),
			isSynced: false,
		});
		this.notifyLocalWrite();
	}

	private notifyLocalWrite(): void {
		try {
			this.syncTrigger.notifyLocalWrite();
		} catch (error) {
			console.error('Sync trigger failed after a local settings write', error);
		}
	}
}
