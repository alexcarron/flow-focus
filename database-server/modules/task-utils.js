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
 * Retrieves a task by id
 * @param {number} taskId - The id number of the task
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
 * @returns {Promise<Object>} A The inserted task row
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

/**
 * Updates a task with the specified properties
 *
 * @param {Object} updatedTaskData - The object containing updated task details.
 * @param {number} [taskData.id] - The id of the task you're updating
 * @param {string} [taskData.action] - The updated action or description of the task.
 * @param {Array<string>} [taskData.steps] - An array of updated step instructions for the task. Each step is added to the database.
 * @param {string} [taskData.start_time] - The updated task's start time (ISO format).
 * @param {string} [taskData.end_time] - The updated task's end time (ISO format).
 * @param {string} [taskData.deadline] - The updated task's deadline (ISO format).
 * @param {number} [taskData.min_duration] - The updated minimum duration of the task, in minutes or other units.
 * @param {number} [taskData.max_duration] - The updated maximum duration of the task, in minutes or other units.
 * @param {string} [taskData.repeat_interval] - The updated interval at which the task repeats (e.g., daily, weekly).
 * @param {boolean} [taskData.is_mandatory] - Whether the task is mandatory (true or false).
 * @param {boolean} [taskData.is_complete] - The updated completion status of the task (true if complete).
 * @param {boolean} [taskData.is_skipped] - Whether the task has been skipped (true if skipped).
 * @param {number} [taskData.last_actioned_step_position] - The position of the last actioned step in the task.
 *
 * @returns {Promise<Object>} A promise that resolves to the updated task row, which contains all task details including the assigned `id`.
 *
 * @throws {Error} If there is a database query error or if the required task data is missing.
 *
 * @example
 * const updatedTask = await updateTask({
 *   id: 1,
 *   action: 'Update project status',
 *   steps: ['Review', 'Update', 'Submit'],
 *   start_time: '2024-10-10T10:00:00Z',
 *   end_time: '2024-10-10T18:00:00Z',
 *   min_duration: 30,
 *   max_duration: 300,
 *   is_complete: true,
 * });
 */
async function updateTask({
	id,
	action,
	steps,
	startTime,
	endTime,
	deadline,
	minDuration,
	maxDuration,
	repeatInterval,
	isMandatory,
	isComplete,
	isSkipped,
	lastActionedStepPosition,
}) {
	if (id === undefined) {
		throw Error('ID not specified for updated task');
	}

	if (steps !== undefined) {
		console.log({id});
		// Clear existing steps associated with the task
		await dbUtils.executeQuery(
			`DELETE FROM ONLY steps WHERE steps.task_id = \${task_id}`,
			{'task_id': id}
		);

		// Insert the updated steps
		for (const stepIndex in steps) {
			const stepInstruction = steps[stepIndex];

			await dbUtils.executeQuery(
				`INSERT INTO steps (task_id, position, instruction) VALUES
					(\${task_id}, \${position}, \${instruction})`,
				{
					'task_id': id,
					'position': stepIndex+1,
					'instruction': stepInstruction,
				}
			);
		}
	}

	const updatedTaskRow = await dbUtils.getFirstRowOfQuery(
		`
		UPDATE tasks
			SET
				action = COALESCE(\${action}, action),
				start_time = COALESCE(\${start_time}, start_time),
				end_time = COALESCE(\${end_time}, end_time),
				deadline = COALESCE(\${deadline}, deadline),
				min_duration = COALESCE(\${min_duration}, min_duration),
				max_duration = COALESCE(\${max_duration}, max_duration),
				repeat_interval = COALESCE(\${repeat_interval}, repeat_interval),
				is_mandatory = COALESCE(\${is_mandatory}, is_mandatory),
				is_complete = COALESCE(\${is_complete}, is_complete),
				is_skipped = COALESCE(\${is_skipped}, is_skipped),
				last_actioned_step_position = COALESCE(\${last_actioned_step_position}, last_actioned_step_position)
			WHERE id = \${task_id}
			RETURNING *;
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
			'last_actioned_step_position': lastActionedStepPosition,
			'task_id': id,
		}
	);

	return updatedTaskRow;
}

/**
 * Deletes a task from the database
 * @param {number} taskId - The id of the task deleting
 * @returns The deleted task
 */
async function deleteTask(taskId) {
	const deletedTask = await dbUtils.getFirstRowOfQuery(
		`
		DELETE FROM tasks
			WHERE id = \${task_id}
			RETURNING *
		`,
		{'task_id': taskId}
	);

	return deletedTask;
}

module.exports = {COLUMN_NAMES, getTasks, getTask, addTask, updateTask, deleteTask}