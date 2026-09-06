import { AppSettings } from '../model/AppSettings';

export interface SettingsRepository {
	get(): Promise<AppSettings | undefined>;
	save(settings: AppSettings): Promise<void>;
}
