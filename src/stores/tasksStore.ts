import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Patch, produceWithPatches, applyPatches, enablePatches, setAutoFreeze } from 'immer';
import Task from '../model/task/Task';
import TaskState from '../model/task/TaskState';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import TasksManager from '../model/TasksManager';
import TaskPrioritizer from '../model/TaskPrioritizer';
import { db } from '../db/flowfocus.db';
import { serializeTask, deserializeRow } from '../db/task.serializer';
import type { BackupTask } from '../utils/backup';

enablePatches();
setAutoFreeze(false);

interface PatchEntry {
	forwardPatches: Patch[];
	inversePatches: Patch[];
}

interface TasksState {
	tasks: Task[];
	isLoading: boolean;
	undoStack: PatchEntry[];
	redoStack: PatchEntry[];
}

interface TasksActions {
	loadTasks: () => Promise<void>;
	refreshTasks: () => void;
	persistChangedTasks: (tasks: Task[]) => Promise<void>;

	executeWithPatches: (action: () => void, affectedTasks?: Task[]) => void;

	completeNextStep: (task: Task) => void;
	completeAllSteps: (task: Task) => void;
	skipNextStep: (task: Task) => void;
	deferTask: (task: Task, ms: number) => void;
	setDescription: (task: Task, description: string) => void;
	setSteps: (task: Task, steps: string[]) => void;
	setStep: (task: Task, oldStep: string, newStep: string) => void;
	setDeadline: (task: Task, deadline: Date | null) => void;
	setMandatory: (task: Task, value: boolean) => void;
	setTimingOptions: (task: Task, options: TaskTimingOptions) => void;
	setComplete: (task: Task, isComplete: boolean) => void;
	setStepComplete: (task: Task, step: string, isComplete: boolean) => void;

	addTask: (description: string, timingOptions?: Partial<TaskTimingOptions>) => Promise<Task>;
	deleteTask: (task: Task) => Promise<void>;
	importTasks: (backupTasks: BackupTask[]) => Promise<void>;

	undo: () => void;
	redo: () => void;
}

// Single TasksManager instance shared across the store
export const tasksManager = new TasksManager();

// Guard against concurrent loadTasks calls (e.g. React StrictMode double-effect)
let loadTasksInProgress = false;

async function persistTask(task: Task): Promise<void> {
	try {
		if (task.dbId !== undefined) {
			await db.tasks.put(serializeTask(task, task.dbId));
		} else {
			const id = await db.tasks.add(serializeTask(task));
			task.dbId = id as number;
		}
	} catch (err) {
		console.error('Failed to persist task:', err);
	}
}

async function deleteFromDb(id: number): Promise<void> {
	try {
		await db.tasks.delete(id);
	} catch (err) {
		console.error('Failed to delete task from Dexie:', err);
	}
}

export const useTasksStore = create<TasksState & TasksActions>()(
	immer((set, get) => ({
		tasks: [],
		isLoading: true,
		undoStack: [],
		redoStack: [],

		async loadTasks() {
			if (loadTasksInProgress) return;
			loadTasksInProgress = true;
			try {
				tasksManager.clearTasks();
				const rows = await db.tasks.toArray();
				rows.forEach(row => {
					const data = deserializeRow(row);
					const task = tasksManager.addCreatedTask(data.description);
					task.dbId = row.id;
					task.setStepsToStatusMap(data.stepsToStatusMap);
					task.setStartTime(data.startTime);
					task.setEndTime(data.endTime);
					task.setDeadline(data.deadline);
					task.setMinRequiredTime(data.minRequiredTime);
					task.setMaxRequiredTime(data.maxRequiredTime);
					task.setRepeatInterval(data.repeatInterval);
					task.setMandatory(data.isMandatory);
					task.setComplete(data.isComplete);
					task.setSkipped(data.isSkipped);
					task.setLastActionedStep(data.lastActionedStep);

					if (task.isRecurring() && task.isPastIntervalEndTime(new Date())) {
						task.onPastIntervalEndTime(new Date());
					}
				});
				set(state => {
					state.tasks = [...tasksManager.getTasks()];
					state.isLoading = false;
				});
			} catch (err) {
				console.error('Failed to load tasks from Dexie:', err);
				set(state => { state.isLoading = false; });
			} finally {
				loadTasksInProgress = false;
			}
		},

		refreshTasks() {
			set(state => {
				state.tasks = [...tasksManager.getTasks()];
			});
		},

		async persistChangedTasks(tasks: Task[]) {
			for (const task of tasks) {
				await persistTask(task);
			}
		},

		executeWithPatches(action: () => void, affectedTasks?: Task[]) {
			const currentTasks = get().tasks;
			const statesBefore: TaskState[] = currentTasks.map(t => t.getState());

			action();

			const statesAfter: TaskState[] = currentTasks.map(t => t.getState());

			const [, forwardPatches, inversePatches] = produceWithPatches(statesBefore, (draft: TaskState[]) => {
				statesAfter.forEach((afterState, i) => {
					if (draft[i]) {
						draft[i].description = afterState.description;
						draft[i].isComplete = afterState.isComplete;
						draft[i].isMandatory = afterState.isMandatory;
						draft[i].isSkipped = afterState.isSkipped;
						draft[i].startTime = afterState.startTime;
						draft[i].endTime = afterState.endTime;
						draft[i].deadline = afterState.deadline;
						draft[i].minDuration = afterState.minDuration;
						draft[i].maxDuration = afterState.maxDuration;
						draft[i].repeatInterval = afterState.repeatInterval;
						draft[i].lastActionedStep = afterState.lastActionedStep;
						draft[i].stepsToStatusMap = afterState.stepsToStatusMap;
					}
				});
			});

			set(state => {
				state.undoStack.push({ forwardPatches, inversePatches });
				state.redoStack = [];
				state.tasks = [...tasksManager.getTasks()];
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

		skipNextStep(task: Task) {
			get().executeWithPatches(() => task.skipNextStep(), [task]);
		},

		deferTask(task: Task, ms: number) {
			get().executeWithPatches(() => {
				const newStartTime = new Date(Date.now() + ms);
				task.setStartTime(newStartTime);
			}, [task]);
		},

		setDescription(task: Task, description: string) {
			get().executeWithPatches(() => task.setDescription(description), [task]);
		},

		setSteps(task: Task, steps: string[]) {
			get().executeWithPatches(() => task.editSteps(steps), [task]);
		},

		setStep(task: Task, oldStep: string, newStep: string) {
			get().executeWithPatches(() => task.editStep(oldStep, newStep), [task]);
		},

		setDeadline(task: Task, deadline: Date | null) {
			get().executeWithPatches(() => task.setDeadline(deadline), [task]);
		},

		setMandatory(task: Task, value: boolean) {
			get().executeWithPatches(() => task.setMandatory(value), [task]);
		},

		setTimingOptions(task: Task, options: TaskTimingOptions) {
			get().executeWithPatches(() => task.setFromTaskTimingOptions(options), [task]);
		},

		setComplete(task: Task, isComplete: boolean) {
			task.setComplete(isComplete);
			set(state => { state.tasks = [...tasksManager.getTasks()]; });
			get().persistChangedTasks([task]);
		},

		setStepComplete(task: Task, step: string, isComplete: boolean) {
			if (isComplete) task.completeStep(step);
			else task.uncompleteStep(step);
			set(state => { state.tasks = [...tasksManager.getTasks()]; });
			get().persistChangedTasks([task]);
		},

		async addTask(description: string, timingOptions?: Partial<TaskTimingOptions>) {
			const task = tasksManager.addCreatedTask(description);
			if (timingOptions) {
				if (timingOptions.startTime !== undefined) task.setStartTime(timingOptions.startTime);
				if (timingOptions.endTime !== undefined) task.setEndTime(timingOptions.endTime);
				if (timingOptions.deadline !== undefined) task.setDeadline(timingOptions.deadline);
				if (timingOptions.minDuration !== undefined) task.setMinRequiredTime(timingOptions.minDuration);
				if (timingOptions.maxDuration !== undefined) task.setMaxRequiredTime(timingOptions.maxDuration);
				if (timingOptions.repeatInterval !== undefined && timingOptions.repeatInterval !== null) {
					task.makeRecurring(timingOptions.repeatInterval, timingOptions.startTime ?? new Date());
				}
				if (timingOptions.isMandatory !== undefined) task.setMandatory(timingOptions.isMandatory);
			}
			set(state => { state.tasks = [...tasksManager.getTasks()]; });
			await persistTask(task);
			return task;
		},

		async deleteTask(task: Task) {
			if (task.dbId !== undefined) {
				await deleteFromDb(task.dbId);
			}
			tasksManager.deleteTask(task);
			set(state => { state.tasks = [...tasksManager.getTasks()]; });
		},

		async importTasks(backupTasks: BackupTask[]) {
			tasksManager.clearTasks();
			await db.tasks.clear();
			for (const bt of backupTasks) {
				const task = tasksManager.addCreatedTask(bt.description);
				task.setStepsToStatusMap(new Map(Object.entries(bt.steps)));
				task.setStartTime(bt.startTime ? new Date(bt.startTime) : null);
				task.setEndTime(bt.endTime ? new Date(bt.endTime) : null);
				task.setDeadline(bt.deadline ? new Date(bt.deadline) : null);
				task.setMinRequiredTime(bt.minRequiredTime);
				task.setMaxRequiredTime(bt.maxRequiredTime);
				task.setRepeatInterval(bt.repeatInterval);
				task.setMandatory(bt.isMandatory);
				task.setComplete(bt.isComplete);
				task.setSkipped(bt.isSkipped);
				task.setLastActionedStep(bt.lastActionedStep);

				if (task.isRecurring() && task.isPastIntervalEndTime(new Date())) {
					task.onPastIntervalEndTime(new Date());
				}

				await persistTask(task);
			}
			set(state => {
				state.tasks = [...tasksManager.getTasks()];
				state.undoStack = [];
				state.redoStack = [];
			});
		},

		undo() {
			const { undoStack, tasks } = get();
			if (undoStack.length === 0) return;

			const entry = undoStack[undoStack.length - 1];
			const currentStates: TaskState[] = tasks.map(t => t.getState());
			const previousStates = applyPatches(currentStates, entry.inversePatches) as TaskState[];

			previousStates.forEach((state, i) => {
				if (tasks[i]) tasks[i].restoreState(state);
			});

			set(state => {
				state.undoStack.pop();
				state.redoStack.push(entry);
				state.tasks = [...tasksManager.getTasks()];
			});

			get().persistChangedTasks(tasks);
		},

		redo() {
			const { redoStack, tasks } = get();
			if (redoStack.length === 0) return;

			const entry = redoStack[redoStack.length - 1];
			const currentStates: TaskState[] = tasks.map(t => t.getState());
			const nextStates = applyPatches(currentStates, entry.forwardPatches) as TaskState[];

			nextStates.forEach((state, i) => {
				if (tasks[i]) tasks[i].restoreState(state);
			});

			set(state => {
				state.redoStack.pop();
				state.undoStack.push(entry);
				state.tasks = [...tasksManager.getTasks()];
			});

			get().persistChangedTasks(tasks);
		},
	}))
);

export const selectPriorityTask = (state: TasksState): Task | null => {
	const prioritizer = new TaskPrioritizer(tasksManager);
	return prioritizer.getMostImportantTask(new Date());
};

export const selectTasksInPriorityOrder = (state: TasksState): Task[] => {
	const prioritizer = new TaskPrioritizer(tasksManager);
	return prioritizer.getTasksInPriorityOrder(state.tasks, new Date());
};

export function startRecurringTaskTick(): () => void {
	const id = setInterval(() => {
		tasksManager.update(new Date());
		useTasksStore.getState().refreshTasks();
	}, 1000);
	return () => clearInterval(id);
}
