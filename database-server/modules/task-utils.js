import dbUtils from '../modules/db-utils.js';

async function getTasks() {
	dbUtils.getRowsFromQuery()
}

module.exports = {getTasks}