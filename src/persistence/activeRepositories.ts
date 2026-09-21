import { TaskRepository } from './TaskRepository';
import { QuickToDoChecklistRepository } from './QuickToDoChecklistRepository';
import { SettingsRepository } from './SettingsRepository';
import { TagRepository } from './TagRepository';
import { localTaskRepository } from './local/LocalTaskRepository';
import { localQuickToDoChecklistRepository } from './local/LocalQuickToDoChecklistRepository';
import { localSettingsRepository } from './local/LocalSettingsRepository';
import { localTagRepository } from './local/LocalTagRepository';

export interface ActiveRepositories {
	taskRepository: TaskRepository;
	quickToDoChecklistRepository: QuickToDoChecklistRepository;
	settingsRepository: SettingsRepository;
	tagRepository: TagRepository;
}

let activeRepositories: ActiveRepositories = {
	taskRepository: localTaskRepository,
	quickToDoChecklistRepository: localQuickToDoChecklistRepository,
	settingsRepository: localSettingsRepository,
	tagRepository: localTagRepository,
};

export function getActiveRepositories(): ActiveRepositories {
	return activeRepositories;
}

export function setActiveRepositories(repositories: ActiveRepositories): void {
	activeRepositories = repositories;
}
