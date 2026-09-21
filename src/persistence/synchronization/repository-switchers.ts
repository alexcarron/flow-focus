import { setActiveRepositories } from '../activeRepositories';
import { localTaskRepository } from '../local/LocalTaskRepository';
import { localSettingsRepository } from '../local/LocalSettingsRepository';
import { localQuickToDoChecklistRepository } from '../local/LocalQuickToDoChecklistRepository';
import { localTagRepository } from '../local/LocalTagRepository';
import { CachedTaskRepository } from './CachedTaskRepository';
import { CachedSettingsRepository } from './CachedSettingsRepository';
import { CachedQuickToDoChecklistRepository } from './CachedQuickToDoChecklistRepository';
import { closeActiveUserCacheDatabase, openUserCacheDatabase } from './perUserCache';
import { LocalCloudDataSynchronizer } from './LocalCloudDataSynchronizer';
import { createSupabaseDataService } from '../cloud/supabaseDataService';
import { useTasksStore } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useQuickToDoChecklistStore } from '../../stores/quickToDoChecklistStore';
import { useTagsStore } from '../../stores/tagsStore';
import { useSyncStatusStore } from '../../stores/syncStatusStore';

let activeSynchronizer: LocalCloudDataSynchronizer | undefined;

export async function reloadAllStores(): Promise<void> {
	await Promise.all([
		useTasksStore.getState().loadTasks(),
		useSettingsStore.getState().loadSettings(),
		useQuickToDoChecklistStore.getState().loadQuickToDoChecklist(),
		useTagsStore.getState().loadTags(),
	]);
}

export async function switchRepositoriesToCloud(userID: string, isRepositorySwitchStale: () => boolean): Promise<void> {
	useTasksStore.setState({ isLoading: true });

	activeSynchronizer?.stop();

	const cacheDB = openUserCacheDatabase(userID);
	const cloudDataService = createSupabaseDataService(userID);

	const synchronizer = new LocalCloudDataSynchronizer({
		cacheDB,
		cloudDataService,
		onTasksChanged: () => void useTasksStore.getState().loadTasks(),
		onSettingsChanged: () => void useSettingsStore.getState().loadSettings(),
		onChecklistChanged: () => void useQuickToDoChecklistStore.getState().loadQuickToDoChecklist(),
		onSyncStatusChange: status => useSyncStatusStore.getState().reportSyncStatus(status),
	});
	activeSynchronizer = synchronizer;

	setActiveRepositories({
		taskRepository: new CachedTaskRepository(userID, synchronizer),
		settingsRepository: new CachedSettingsRepository(userID, synchronizer),
		quickToDoChecklistRepository: new CachedQuickToDoChecklistRepository(userID, synchronizer),
		tagRepository: localTagRepository,
	});

	await reloadAllStores();
	if (isRepositorySwitchStale()) return;

	synchronizer.start();
}

export function requestCloudSync(): Promise<void> {
	return activeSynchronizer?.sync() ?? Promise.resolve();
}

export async function switchRepositoriesToLocal(): Promise<void> {
	useTasksStore.setState({ isLoading: true });

	activeSynchronizer?.stop();
	activeSynchronizer = undefined;

	setActiveRepositories({
		taskRepository: localTaskRepository,
		settingsRepository: localSettingsRepository,
		quickToDoChecklistRepository: localQuickToDoChecklistRepository,
		tagRepository: localTagRepository,
	});

	closeActiveUserCacheDatabase();
	useSyncStatusStore.getState().reset();

	await reloadAllStores();
}
