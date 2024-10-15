const dbUtils = require('../modules/db-utils');

/**
 * Retrieves all tasks
 * @returns {Promise<{[key: string]: any}[]>} An array of task objects
 */
async function getTasks() {
	const taskRows = await dbUtils.getRowsOfQuery("SELECT * FROM tasks");
	return taskRows;
}

module.exports = {getTasks}