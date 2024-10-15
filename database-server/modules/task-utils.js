const dbUtils = require('../modules/db-utils');

const COLUMN_NAMES = [
	'id',
	'action',
	'start_time',
	'end_time',
	'deadline',
	'min_duration',
	'max_duration',
	'repeat_interval',
	'is_mandatory',
	'is_complete',
	'is_skipped',
	'last_actioned_step_position',
];

/**
 * Retrieves all tasks
 * @returns {Promise<{[key: string]: any}[]>} An array of task objects
 */
async function getTasks() {
	const taskRows = await dbUtils.getRowsOfQuery("SELECT * FROM tasks");
	return taskRows;
}

/**
 * Retrieve a task by id
 * @param {number} The id number of the task
 * @returns {Promise<{[key: string]: any}>} The task object with that specified id.
 */
async function getTask(taskId) {
	const taskRow = await dbUtils.getFirstRowOfQuery(
		`SELECT * FROM tasks WHERE id = \${task_id}`,
		{'task_id': taskId}
	);
	return taskRow;
}

/**
 * Creates a task with the specified properties
 *
 * @param {Object} taskData - The object containing task details.
 * @param {string} taskData.action - The action or description of the task.
 * @param {Array<string>} [taskData.steps=[]] - An array of step instructions for the task. Each step is added to the database.
 * @param {string} [taskData.start_time=dbUtils.DEFAULT] - The task's start time (ISO format or database default).
 * @param {string} [taskData.end_time=dbUtils.DEFAULT] - The task's end time (ISO format or database default).
 * @param {string} [taskData.deadline=dbUtils.DEFAULT] - The task's deadline (ISO format or database default).
 * @param {number} [taskData.min_duration=dbUtils.DEFAULT] - The minimum duration of the task, in minutes or other units.
 * @param {number} [taskData.max_duration=dbUtils.DEFAULT] - The maximum duration of the task, in minutes or other units.
 * @param {string} [taskData.repeat_interval=dbUtils.DEFAULT] - The interval at which the task repeats (e.g., daily, weekly, or database default).
 * @param {boolean} [taskData.is_mandatory=dbUtils.DEFAULT] - Whether the task is mandatory (true or false).
 * @param {boolean} [taskData.is_complete=dbUtils.DEFAULT] - The completion status of the task (true if complete).
 * @param {boolean} [taskData.is_skipped=dbUtils.DEFAULT] - Whether the task has been skipped (true if skipped).
 * @param {number} [taskData.last_actioned_step_position=dbUtils.DEFAULT] - The position of the last actioned step in the task.
 *
 * @returns {Promise<Object>} A promise that resolves to the inserted task row, which contains all task details including the assigned `id`.
 *
 * @throws {Error} If there is a database query error or if required task data is missing.
 *
 * @example
 * const newTask = await addTask({
 *   action: 'Complete project',
 *   steps: ['Research', 'Design', 'Develop'],
 *   start_time: '2024-10-10T09:00:00Z',
 *   end_time: '2024-10-10T17:00:00Z',
 *   deadline: '2024-10-15T23:59:59Z',
 *   min_duration: 60,
 *   max_duration: 480,
 *   is_mandatory: true,
 *   is_complete: false,
 *   is_skipped: false,
 * });
 */
async function addTask({
	action,
	steps=[],
	startTime=dbUtils.DEFAULT,
	endTime=dbUtils.DEFAULT,
	deadline=dbUtils.DEFAULT,
	minDuration=dbUtils.DEFAULT,
	maxDuration=dbUtils.DEFAULT,
	repeatInterval=dbUtils.DEFAULT,
	isMandatory=dbUtils.DEFAULT,
	isComplete=dbUtils.DEFAULT,
	isSkipped=dbUtils.DEFAULT,
	lastActionedStepPosition=dbUtils.DEFAULT
}) {
	const taskRow = await dbUtils.getFirstRowOfQuery(
		`
		INSERT INTO tasks (action, start_time, end_time, deadline, min_duration, max_duration, repeat_interval, is_mandatory, is_complete, is_skipped) VALUES
			(\${action}, \${start_time}, \${end_time}, \${deadline}, \${min_duration}, \${max_duration}, \${repeat_interval}, \${is_mandatory}, \${is_complete}, \${is_skipped})
			RETURNING tasks.*
		`,
		{
			'action': action,
			'start_time': startTime,
			'end_time': endTime,
			'deadline': deadline,
			'min_duration': minDuration,
			'max_duration': maxDuration,
			'repeat_interval': repeatInterval,
			'is_mandatory': isMandatory,
			'is_complete': isComplete,
			'is_skipped': isSkipped,
		}
	);

	for (const stepIndex in steps) {
		const stepInstruction = steps[stepIndex];

		await dbUtils.executeQuery(
			`
			INSERT INTO steps (task_id, position, instruction) VALUES
				(\${task_id}, \${position}, \${instruction})
			`,
			{
				'task_id': taskRow.id,
				'position': stepIndex+1,
				'instruction': stepInstruction
			}
		);
	}

	taskRow.last_actioned_step_position = await dbUtils.getFirstValueOfQuery(
		`
		UPDATE tasks
			SET last_actioned_step_position = \${last_actioned_step_position}
			WHERE id = \${task_id}
			RETURNING last_actioned_step_position
		`,
		{
			'last_actioned_step_position': lastActionedStepPosition,
			'task_id': taskRow.id,
		}
	)

	return taskRow;
}

module.exports = {COLUMN_NAMES, getTasks, getTask, addTask}