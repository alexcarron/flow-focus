const dbUtils = require('../modules/db-utils');

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
		"SELECT * FROM tasks WHERE id = ${task_id}",
		{'task_id': taskId}
	);
	return taskRow;
}

module.exports = {getTasks, getTask}