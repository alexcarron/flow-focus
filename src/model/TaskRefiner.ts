import Task from "./task/Task";

export interface TaskRefiner {
	/**
	 * Creates steps for a task to ensure it is managable and actionable if it doesn't have steps
	 * @param task - The task to modify.
	 * @return The modified task.
	 */
	createStepsForTask(task: Task): Task;
	
	/**
	 * Modifies a task's description and steps to be more clear, unambigious, and understandable.
	 * @param task - The task to modify.
	 * @return The modified task.
	 */
	clarifyTask(task: Task): Task;

	/**
	 * Makes a task actionable by ensuring the description and all steps describe a realistic action to take
	 * @param task - The task to modify.
	 * @return The modified task.
	 */
	makeTaskActionable(task: Task): Task;

	/**
	 * Seperates a task into smaller tasks if the task is not focused on a single action
	 * @param task - The task to modify.
	 * @return The seperated tasks
	 */
	seperateTask(task: Task): Task[];
}