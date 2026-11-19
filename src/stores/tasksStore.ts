import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Patch, produceWithPatches, applyPatches, enablePatches, setAutoFreeze } from 'immer';
import Task from '../model/task/Task';
import Step from '../model/task/step/Step';
import { cloneStepsDeep } from '../model/task/step/stepTree';
import TaskState from '../model/task/TaskState';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import TasksManager from '../model/TasksManager';
import TaskPrioritizer from '../model/TaskPrioritizer';
import type TemporaryFocus from '../model/temporary-focus/TemporaryFocus';
import { isTemporaryFocusStillValid } from '../model/temporary-focus/isTemporaryFocusStillValid';
import { didTaskGetCompletedOrSkipped } from '../model/temporary-focus/didTaskGetCompletedOrSkipped';
import { serializeTask, deserializeRow } from '../persistence/cloud/task.serializer';
import { getActiveRepositories } from '../persistence/activeRepositories';
import type { BackupTask } from '../utilities/backup';
import { RunOnceThenAgainIfChanged } from '../utilities/runOnceThenAgainIfChanged';
import { PastedListItem } from '../utilities/parsePastedTextIntoNestedListItems';
import { useTagsStore } from './tagsStore';

enablePatches();
setAutoFreeze(false);

interface PatchEntry {
	forwardPatches: Patch[];
	inversePatches: Patch[];
	temporaryFocusChange?: {
		before: TemporaryFocus | null,
		after: TemporaryFocus | null,
	};
}

interface TasksState {
	tasks: Task[];
	isLoading: boolean;
	undoStack: PatchEntry[];
	redoStack: PatchEntry[];
	temporaryFocus: TemporaryFocus | null;
}

interface TasksActions {
	loadTasks: () => Promise<void>;
	refreshTasks: () => void;
	persistChangedTasks: (tasks: Task[]) => Promise<void>;
	temporarilyFocusTask: (task: Task) => void;
	stopTemporarilyFocusing: () => void;

	executeWithPatches: (action: () => void, affectedTasks?: Task[]) => void;

	completeNextStep: (task: Task) => void;
	completeAllSteps: (task: Task) => void;
	completeStepAndPrecedingSteps: (task: Task, stepID: string) => void;
	uncompleteStepAndFollowingSteps: (task: Task, stepID: string) => void;
	skipNextStep: (task: Task) => void;
	skipTaskUntil: (task: Task, date: Date) => void;
	skipCurrentOccurrence: (task: Task) => void;
	cancelSkip: (task: Task) => void;
	setDescription: (task: Task, description: string) => void;
	setSteps: (task: Task, stepTexts: string[]) => void;
	setStepText: (task: Task, stepID: string, newText: string) => void;
	setDueDate: (task: Task, dueDate: Date | null) => void;
	setTimingOptions: (task: Task, options: TaskTimingOptions) => void;
	setComplete: (task: Task, isComplete: boolean) => void;
	setStepComplete: (task: Task, stepID: string, isComplete: boolean) => void;
	moveStepUp: (task: Task, stepID: string) => void;
	moveStepDown: (task: Task, stepID: string) => void;
	reparentStep: (task: Task, stepID: string, newParentID: string | null, newIndexAmongSiblings: number) => void;
	indentStep: (task: Task, stepID: string) => void;
	unindentStep: (task: Task, stepID: string) => void;
	insertStepBeforeStep: (task: Task, stepID: string) => string;
	insertStepAfterStep: (task: Task, stepID: string) => string;
	insertStepsFromPastedListItems: (task: Task, stepID: string, pastedListItems: PastedListItem[]) => string[];
	addFirstStep: (task: Task) => string;
	deleteStep: (task: Task, stepID: string) => void;

	addTask: (description: string, timingOptions?: Partial<TaskTimingOptions>) => Promise<Task>;
	deleteTask: (task: Task) => Promise<void>;
	importTasks: (backupTasks: BackupTask[]) => Promise<void>;

	addTagToTask: (task: Task, tagName: string) => Promise<void>;
	removeTagFromTask: (task: Task, tagID: string) => Promise<void>;

	undo: () => void;
	redo: () => void;
}

export const tasksManager = new TasksManager();

const loadTasksRunner = new RunOnceThenAgainIfChanged();

function dropTemporaryFocusIfNoLongerValid(state: { temporaryFocus: TemporaryFocus | null }): void {
	if (state.temporaryFocus === null) return;

	const focusableTasksInPriorityOrder = new TaskPrioritizer(tasksManager).getFocusableTasksInPriorityOrder(new Date());
	const isStillValid = isTemporaryFocusStillValid({
		temporaryFocus: state.temporaryFocus,
		focusableTasksInPriorityOrder,
	});
	if (!isStillValid) state.temporaryFocus = null;
}

function getFocusStateOfFocusPage(): { focusedTask: Task | null, isFocusedTaskTemporary: boolean, upcomingTasks: Task[] } {
	const { temporaryFocus } = useTasksStore.getState();
	const focusableTasksInPriorityOrder = new TaskPrioritizer(tasksManager).getFocusableTasksInPriorityOrder(new Date());
	const isTemporaryFocusValid = temporaryFocus !== null && isTemporaryFocusStillValid({
		temporaryFocus,
		focusableTasksInPriorityOrder,
	});

	if (isTemporaryFocusValid) {
		const temporarilyFocusedTask = focusableTasksInPriorityOrder.find(task => task.id === temporaryFocus.taskID) ?? null;
		return {
			focusedTask: temporarilyFocusedTask,
			isFocusedTaskTemporary: true,
			upcomingTasks: focusableTasksInPriorityOrder.filter(task => task !== temporarilyFocusedTask),
		};
	}

	return {
		focusedTask: focusableTasksInPriorityOrder[0] ?? null,
		isFocusedTaskTemporary: false,
		upcomingTasks: focusableTasksInPriorityOrder.slice(1),
	};
}

async function persistTask(task: Task): Promise<void> {
	try {
		await getActiveRepositories().taskRepository.save(serializeTask(task));
	} catch (err) {
		console.error('Failed to persist task:', err);
	}
}

async function softDeleteTask(id: string): Promise<void> {
	try {
		await getActiveRepositories().taskRepository.softDelete(id);
	} catch (err) {
		console.error('Failed to delete task:', err);
	}
}

async function deleteTagIfNoLongerReferenced(tagID: string): Promise<void> {
	const isStillReferenced = useTasksStore.getState().tasks.some(task => task.getTagIDs().includes(tagID));
	if (!isStillReferenced) {
		await useTagsStore.getState().deleteTag(tagID);
	}
}

async function loadTasksFromActiveRepository(): Promise<void> {
	try {
		const rows = await getActiveRepositories().taskRepository.getAll();
		tasksManager.clearTasks();
		rows.forEach(row => {
			const data = deserializeRow(row);
			const task = tasksManager.addCreatedTask(data.description, {
				taskID: row.id,
				createdAt: data.createdAt,
			});
			task.replaceAllSteps(data.steps);
			task.setStartDate(data.startDate);
			task.setTargetDate(data.targetDate);
			task.setDueDate(data.dueDate);
			task.setMinRequiredTime(data.minRequiredTime);
			task.setMaxRequiredTime(data.maxRequiredTime);
			task.setRecurrenceDuration(data.recurrenceDuration);
			task.setShouldNotSkipMissedOccurrences(data.shouldNotSkipMissedOccurrences);
			task.setCompletedOccurrenceIndex(data.completedOccurrenceIndex);
			task.setSkippedOccurrenceIndex(data.skippedOccurrenceIndex);
			task.setProgressOccurrenceIndex(data.progressOccurrenceIndex);
			task.setComplete(data.isComplete);
			task.setSkipped(data.isSkipped);
			task.setSkippedUntil(data.skippedUntil);
			task.setLastActionedStep(data.lastActionedStep);
			data.tagIDs.forEach(tagID => task.addTagID(tagID));
			task.refreshCurrentOccurrence(new Date());
		});
		useTasksStore.setState(state => {
			state.tasks = [...tasksManager.getTasks()];
			state.isLoading = false;
			dropTemporaryFocusIfNoLongerValid(state);
		});
	} catch (err) {
		console.error('Failed to load tasks from the active repository:', err);
		useTasksStore.setState(state => { state.isLoading = false; });
	}
}

export const useTasksStore = create<TasksState & TasksActions>()(
	immer((set, get) => ({
		tasks: [],
		isLoading: true,
		undoStack: [],
		redoStack: [],
		temporaryFocus: null,

		loadTasks() {
			return loadTasksRunner.run(() => loadTasksFromActiveRepository());
		},

		refreshTasks() {
			set(state => {
				state.tasks = [...tasksManager.getTasks()];
				dropTemporaryFocusIfNoLongerValid(state);
			});
		},

		temporarilyFocusTask(task: Task) {
			const priorityTask = new TaskPrioritizer(tasksManager).getPriorityTask(new Date());
			set(state => {
				const isTaskAlreadyThePriorityTask = priorityTask === null || priorityTask.id === task.id;
				if (isTaskAlreadyThePriorityTask) {
					state.temporaryFocus = null;
					return;
				}
				state.temporaryFocus = {
					taskID: task.id,
					priorityTaskIDWhenFocused: priorityTask.id,
				};
			});
		},

		stopTemporarilyFocusing() {
			set(state => { state.temporaryFocus = null; });
		},

		async persistChangedTasks(tasks: Task[]) {
			for (const task of tasks) {
				await persistTask(task);
			}
		},

		executeWithPatches(action: () => void, affectedTasks?: Task[]) {
			const currentTasks = get().tasks;
			const temporaryFocusBefore = get().temporaryFocus;
			const taskIDToStateBefore: Record<string, TaskState> = {};
			currentTasks.forEach(t => { taskIDToStateBefore[t.id] = t.getState(); });

			action();
			tasksManager.update(new Date());

			const taskIDToStateAfter: Record<string, TaskState> = {};
			currentTasks.forEach(t => { taskIDToStateAfter[t.id] = t.getState(); });

			const [, forwardPatches, inversePatches] = produceWithPatches(taskIDToStateBefore, (draft: Record<string, TaskState>) => {
				Object.entries(taskIDToStateAfter).forEach(([taskID, afterState]) => {
					if (draft[taskID]) {
						draft[taskID] = afterState;
					}
				});
			});

			set(state => {
				state.tasks = [...tasksManager.getTasks()];
				const temporarilyFocusedTaskID = temporaryFocusBefore?.taskID;
				const wasTemporarilyFocusedTaskCompletedOrSkipped = temporarilyFocusedTaskID !== undefined &&
					taskIDToStateBefore[temporarilyFocusedTaskID] !== undefined &&
					taskIDToStateAfter[temporarilyFocusedTaskID] !== undefined &&
					didTaskGetCompletedOrSkipped({
						stateBefore: taskIDToStateBefore[temporarilyFocusedTaskID],
						stateAfter: taskIDToStateAfter[temporarilyFocusedTaskID],
					});
				if (wasTemporarilyFocusedTaskCompletedOrSkipped) state.temporaryFocus = null;
				dropTemporaryFocusIfNoLongerValid(state);

				const temporaryFocusAfter = state.temporaryFocus;
				const didTemporaryFocusGetDropped = temporaryFocusBefore !== null && temporaryFocusAfter === null;
				state.undoStack.push({
					forwardPatches,
					inversePatches,
					...(didTemporaryFocusGetDropped && { temporaryFocusChange: { before: temporaryFocusBefore, after: temporaryFocusAfter } }),
				});
				state.redoStack = [];
			});

			const tasksToSave = affectedTasks ?? currentTasks;
			get().persistChangedTasks(tasksToSave);
		},

		completeNextStep(task: Task) {
			get().executeWithPatches(() => task.completeNextStep(), [task]);
		},

		completeAllSteps(task: Task) {
			get().executeWithPatches(() => task.completeAllSteps(), [task]);
		},

		completeStepAndPrecedingSteps(task: Task, stepID: string) {
			get().executeWithPatches(() => task.completeStepAndPrecedingSteps(stepID), [task]);
		},

		uncompleteStepAndFollowingSteps(task: Task, stepID: string) {
			get().executeWithPatches(() => task.uncompleteStepAndFollowingSteps(stepID), [task]);
		},

		skipNextStep(task: Task) {
			get().executeWithPatches(() => task.skipNextStep(), [task]);
		},

		skipTaskUntil(task: Task, date: Date) {
			get().executeWithPatches(() => task.skipUntil(date), [task]);
		},

		skipCurrentOccurrence(task: Task) {
			get().executeWithPatches(() => task.skipCurrentOccurrence(), [task]);
		},

		cancelSkip(task: Task) {
			get().executeWithPatches(() => task.cancelSkip(), [task]);
		},

		setDescription(task: Task, description: string) {
			get().executeWithPatches(() => task.setDescription(description), [task]);
		},

		setSteps(task: Task, stepTexts: string[]) {
			get().executeWithPatches(() => task.editStepsText(stepTexts), [task]);
		},

		setStepText(task: Task, stepID: string, newText: string) {
			get().executeWithPatches(() => task.editStepText(stepID, newText), [task]);
		},

		setDueDate(task: Task, dueDate: Date | null) {
			get().executeWithPatches(() => task.setDueDate(dueDate), [task]);
		},

		setTimingOptions(task: Task, options: TaskTimingOptions) {
			get().executeWithPatches(() => task.setFromTaskTimingOptions(options), [task]);
		},

		setComplete(task: Task, isComplete: boolean) {
			task.setComplete(isComplete);
			set(state => {
				state.tasks = [...tasksManager.getTasks()];
				if (isComplete && state.temporaryFocus?.taskID === task.id) state.temporaryFocus = null;
				dropTemporaryFocusIfNoLongerValid(state);
			});
			get().persistChangedTasks([task]);
		},

		setStepComplete(task: Task, stepID: string, isComplete: boolean) {
			get().executeWithPatches(() => {
				if (isComplete) task.completeStep(stepID);
				else task.uncompleteStep(stepID);
			}, [task]);
		},

		moveStepUp(task: Task, stepID: string) {
			get().executeWithPatches(() => task.moveStepAmongSiblings(stepID, 'up'), [task]);
		},

		moveStepDown(task: Task, stepID: string) {
			get().executeWithPatches(() => task.moveStepAmongSiblings(stepID, 'down'), [task]);
		},

		reparentStep(task: Task, stepID: string, newParentID: string | null, newIndexAmongSiblings: number) {
			get().executeWithPatches(() => task.reparentStep(stepID, newParentID, newIndexAmongSiblings), [task]);
		},

		indentStep(task: Task, stepID: string) {
			get().executeWithPatches(() => task.indentStep(stepID), [task]);
		},

		unindentStep(task: Task, stepID: string) {
			get().executeWithPatches(() => task.unindentStep(stepID), [task]);
		},

		insertStepBeforeStep(task: Task, stepID: string) {
			let newStepID = '';
			get().executeWithPatches(() => {
				newStepID = task.createStepLeftOfStep(stepID).id;
			}, [task]);
			return newStepID;
		},

		insertStepAfterStep(task: Task, stepID: string) {
			let newStepID = '';
			get().executeWithPatches(() => {
				newStepID = task.createStepRightOfStep(stepID).id;
			}, [task]);
			return newStepID;
		},

		insertStepsFromPastedListItems(task: Task, stepID: string, pastedListItems: PastedListItem[]) {
			let newStepIDs: string[] = [];
			get().executeWithPatches(() => {
				newStepIDs = task.insertStepsFromPastedListItems(stepID, pastedListItems);
			}, [task]);
			return newStepIDs;
		},

		addFirstStep(task: Task) {
			let newStepID = '';
			get().executeWithPatches(() => {
				newStepID = task.addStep('').id;
			}, [task]);
			return newStepID;
		},

		deleteStep(task: Task, stepID: string) {
			get().executeWithPatches(() => task.deleteStep(stepID), [task]);
		},

		async addTask(description: string, timingOptions?: Partial<TaskTimingOptions>) {
			Task.assertDatesInOrder({
				startDate: timingOptions?.startDate ?? null,
				targetDate: timingOptions?.targetDate ?? null,
				dueDate: timingOptions?.dueDate ?? null,
			});

			const task = tasksManager.addCreatedTask(description);
			if (timingOptions) {
				if (timingOptions.startDate !== undefined) task.setStartDate(timingOptions.startDate);
				if (timingOptions.targetDate !== undefined) task.setTargetDate(timingOptions.targetDate);
				if (timingOptions.dueDate !== undefined) task.setDueDate(timingOptions.dueDate);
				if (timingOptions.minDuration !== undefined) task.setMinRequiredTime(timingOptions.minDuration);
				if (timingOptions.maxDuration !== undefined) task.setMaxRequiredTime(timingOptions.maxDuration);
				if (timingOptions.shouldNotSkipMissedOccurrences !== undefined) task.setShouldNotSkipMissedOccurrences(timingOptions.shouldNotSkipMissedOccurrences);
				if (timingOptions.recurrenceDuration !== undefined && timingOptions.recurrenceDuration !== null) {
					task.makeRecurring(timingOptions.recurrenceDuration, timingOptions.startDate ?? new Date());
				}
			}
			await persistTask(task);
			set(state => { state.tasks = [...tasksManager.getTasks()]; });
			return task;
		},

		async deleteTask(task: Task) {
			const tagIDsToCheck = task.getTagIDs();
			await softDeleteTask(task.id);
			tasksManager.deleteTask(task);
			set(state => {
				state.tasks = [...tasksManager.getTasks()];
				dropTemporaryFocusIfNoLongerValid(state);
			});
			for (const tagID of tagIDsToCheck) {
				await deleteTagIfNoLongerReferenced(tagID);
			}
		},

		async addTagToTask(task: Task, tagName: string) {
			const trimmedName = tagName.trim();
			const existingTag = useTagsStore.getState().tags.find(tag => tag.name.toLowerCase() === trimmedName.toLowerCase());
			const tag = existingTag ?? await useTagsStore.getState().addTag(trimmedName);
			get().executeWithPatches(() => task.addTagID(tag.id), [task]);
		},

		async removeTagFromTask(task: Task, tagID: string) {
			get().executeWithPatches(() => task.removeTagID(tagID), [task]);
			await deleteTagIfNoLongerReferenced(tagID);
		},

		async importTasks(backupTasks: BackupTask[]) {
			tasksManager.clearTasks();
			await getActiveRepositories().taskRepository.clear();
			for (const backupTask of backupTasks) {
				const task = tasksManager.addCreatedTask(backupTask.description, { createdAt: new Date(backupTask.createdAt) });
				task.replaceAllSteps(cloneStepsDeep(backupTask.steps as Step[]));
				task.setStartDate(backupTask.startDate ? new Date(backupTask.startDate) : null);
				task.setTargetDate(backupTask.targetDate ? new Date(backupTask.targetDate) : null);
				task.setDueDate(backupTask.dueDate ? new Date(backupTask.dueDate) : null);
				task.setMinRequiredTime(backupTask.minRequiredTime);
				task.setMaxRequiredTime(backupTask.maxRequiredTime);
				task.setRecurrenceDuration(backupTask.recurrenceDuration);
				task.setShouldNotSkipMissedOccurrences(backupTask.shouldNotSkipMissedOccurrences);
				task.setCompletedOccurrenceIndex(backupTask.completedOccurrenceIndex);
				task.setSkippedOccurrenceIndex(backupTask.skippedOccurrenceIndex);
				task.setProgressOccurrenceIndex(backupTask.progressOccurrenceIndex);
				task.setComplete(backupTask.isComplete);
				task.setSkipped(backupTask.isSkipped);
				task.setSkippedUntil(backupTask.skippedUntil ? new Date(backupTask.skippedUntil) : null);
				task.setLastActionedStep(backupTask.lastActionedStep);
				backupTask.tagIDs.forEach(tagID => task.addTagID(tagID));
				task.refreshCurrentOccurrence(new Date());

				await persistTask(task);
			}
			set(state => {
				state.tasks = [...tasksManager.getTasks()];
				state.undoStack = [];
				state.redoStack = [];
				state.temporaryFocus = null;
			});
		},

		undo() {
			const { undoStack, tasks } = get();
			if (undoStack.length === 0) return;

			const entry = undoStack[undoStack.length - 1];
			const taskIDToTask = new Map(tasks.map(t => [t.id, t]));
			const taskIDToCurrentState: Record<string, TaskState> = {};
			tasks.forEach(t => { taskIDToCurrentState[t.id] = t.getState(); });
			const taskIDToPreviousState = applyPatches(taskIDToCurrentState, entry.inversePatches) as Record<string, TaskState>;

			Object.entries(taskIDToPreviousState).forEach(([taskID, state]) => {
				const task = taskIDToTask.get(taskID);
				if (task) task.restoreState(state);
			});

			set(state => {
				state.undoStack.pop();
				state.redoStack.push(entry);
				state.tasks = [...tasksManager.getTasks()];
				if (entry.temporaryFocusChange) state.temporaryFocus = entry.temporaryFocusChange.before;
				dropTemporaryFocusIfNoLongerValid(state);
			});

			get().persistChangedTasks(tasks);
		},

		redo() {
			const { redoStack, tasks } = get();
			if (redoStack.length === 0) return;

			const entry = redoStack[redoStack.length - 1];
			const taskIDToTask = new Map(tasks.map(t => [t.id, t]));
			const taskIDToCurrentState: Record<string, TaskState> = {};
			tasks.forEach(t => { taskIDToCurrentState[t.id] = t.getState(); });
			const taskIDToNextState = applyPatches(taskIDToCurrentState, entry.forwardPatches) as Record<string, TaskState>;

			Object.entries(taskIDToNextState).forEach(([taskID, state]) => {
				const task = taskIDToTask.get(taskID);
				if (task) task.restoreState(state);
			});

			set(state => {
				state.redoStack.pop();
				state.undoStack.push(entry);
				state.tasks = [...tasksManager.getTasks()];
				if (entry.temporaryFocusChange) state.temporaryFocus = entry.temporaryFocusChange.after;
				dropTemporaryFocusIfNoLongerValid(state);
			});

			get().persistChangedTasks(tasks);
		},
	}))
);

export const selectPriorityTask = (state: TasksState): Task | null => {
	const prioritizer = new TaskPrioritizer(tasksManager);
	return prioritizer.getPriorityTask(new Date());
};

export const selectFocusedTask = (): Task | null => getFocusStateOfFocusPage().focusedTask;

export const selectIsFocusedTaskTemporary = (): boolean => getFocusStateOfFocusPage().isFocusedTaskTemporary;

export const selectUpcomingTasks = (): Task[] => getFocusStateOfFocusPage().upcomingTasks;

export const selectTasksInPriorityOrder = (state: TasksState): Task[] => {
	const prioritizer = new TaskPrioritizer(tasksManager);
	return prioritizer.getTasksInPriorityOrder(state.tasks, new Date());
};

export const selectTasksInTaskManagerOrder = (state: TasksState): Task[] => {
	const prioritizer = new TaskPrioritizer(tasksManager);
	return prioritizer.getTasksInTaskManagerOrder(state.tasks, new Date());
};

export function startRecurringTaskTick(): () => void {
	const id = setInterval(() => {
		tasksManager.update(new Date());
		useTasksStore.getState().refreshTasks();
	}, 1000);
	return () => clearInterval(id);
}
