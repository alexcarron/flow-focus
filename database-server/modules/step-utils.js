const dbUtils = require('../modules/db-utils');

const COLUMN_NAMES = [
	'task_id',
	'position',
	'instruction',
	'status',
];

/**
 * Retrieves all steps
 * @returns {Promise<{[key: string]: any}[]>} An array of step objects
 */
async function getSteps() {
	const stepRows = await dbUtils.getRowsOfQuery("SELECT * FROM steps");
	return stepRows;
}

/**
 * Retrieves all steps of a certain task
 * @param {number} taskId - The id of the certain task
 * @returns {Promise<{[key: string]: any}[]>} An array of step objects from the task
 */
async function getStepsOfTask(taskId) {
	const stepRows = await dbUtils.getRowsOfQuery(
		`
		SELECT * FROM steps
			WHERE steps.task_id = \${task_id}
		`,
		{'task_id': taskId}
	);
	return stepRows;
}

/**
 * Retrieves a step by task id and position
 * @param {number} taskId - The id of the task the step is from
 * @param {number} position - The position number of the step
 * @returns {Promise<{[key: string]: any}>} The step object with that specified task and position
 */
async function getStep(taskId, position) {
	const stepRow = await dbUtils.getFirstRowOfQuery(
		`
		SELECT * FROM steps
			WHERE
				steps.task_id = \${task_id} AND
				steps.position = \${position}
		`,
		{'task_id': taskId, 'position': position}
	);
	return stepRow;
}

/**
 * Retrieves the number of steps a task has
 * @param {number} taskId - The id of the task
 * @returns The number of steps the task has
 */
async function getNumStepsInTask(taskId) {
	const numStepsString = await dbUtils.getFirstValueOfQuery(
		`
		SELECT COUNT(*) FROM steps
			WHERE task_id = \${task_id}
		`,
		{'task_id': taskId}
	)

	return parseInt(numStepsString);
}

/**
 * Adds a step to a task with the specified properties
 *
 * @param {Object} stepData - The object containing the step properties
 * @param {number} stepData.taskId - The id of the task the step is being added to
 * @param {number} stepData.position - The position number of the step
 * @param {string} stepData.instruction - The instruction text for the step
 * @param {string} stepData.stepStatus - The status of the step. UNCOMPLETE by default
 *
 * @returns {Promise<Object>} The inserted step row
 *
 * @throws {Error} If there is a database query error or if required step data is missing.
 */
async function addStep({
	taskId,
	position,
	instruction,
	status=dbUtils.DEFAULT,
}) {
	if (position === undefined) {
		position = await getNumStepsInTask(taskId) + 1;
	}

	const stepRow = await dbUtils.getFirstRowOfQuery(
		`
		INSERT INTO steps (task_id, position, instruction, status) VALUES
			(\${task_id}, \${position}, \${instruction}, \${status})
			RETURNING *
		`,
		{
			'task_id': taskId,
			'position': position,
			'instruction': instruction,
			'status': status,
		}
	)

	return stepRow;
}

module.exports = {COLUMN_NAMES, getSteps, getStepsOfTask, getStep, addStep, getNumStepsInTask}