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

module.exports = {COLUMN_NAMES, getSteps, getStepsOfTask, getStep}