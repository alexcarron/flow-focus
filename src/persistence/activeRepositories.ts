import { TaskRepository } from './TaskRepository';
import { QuickToDoChecklistRepository } from './QuickToDoChecklistRepository';
import { SettingsRepository } from './SettingsRepository';
import { localTaskRepository } from './local/LocalTaskRepository';
import { localQuickToDoChecklistRepository } from './local/LocalQuickToDoChecklistRepository';
import { localSettingsRepository } from './local/LocalSettingsRepository';

export interface ActiveRepositories {
	taskRepository: TaskRepository;
	quickToDoChecklistRepository: QuickToDoChecklistRepository;
	settingsRepository: SettingsRepository;
}

let activeRepositories: ActiveRepositories = {
	taskRepository: localTaskRepository,
	quickToDoChecklistRepository: localQuickToDoChecklistRepository,
	settingsRepository: localSettingsRepository,
};

export function getActiveRepositories(): ActiveRepositories {
	return activeRepositories;
}

export function setActiveRepositories(repositories: ActiveRepositories): void {
	activeRepositories = repositories;
}
