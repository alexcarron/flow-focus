const connectionPool = require("./create-db-connection");
const fs = require('fs');
const path = require('path');

const SQL_SCRIPTS_DIRECTORY = 'sql_scripts';

/**
 * Executes an SQL file and retrieves the result.
 * @param {string} sqlFileName The name of the SQL file including the extension.
 * @returns {Promise<import("pg").QueryResult>} A result object including information about the outcome of that query
 */
async function executeSQLFile(sqlFileName) {
	try {
		const sqlFilePath = path.resolve(__dirname, '..', SQL_SCRIPTS_DIRECTORY, sqlFileName)
		const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

		const result = await connectionPool.query(sqlQuery);
		console.log(`> Executed SQL File ${sqlFileName}`);
		return result
	}
	catch (error) {
		console.error(`Error executing SQL file ${sqlFileName}`);
		throw error;
	}
}

/**
 * Execute an SQL query.
 * @param {string} sqlQuery The SQL query executing.
 * @returns {Promise<import("pg").QueryResult>} A result object including information about the outcome of that query.
 */
async function executeQuery(sqlQuery) {
	try {
		const result = await connectionPool.query(sqlQuery);
		console.log(`> ${sqlQuery}`);
		return result;
	}
	catch (error) {
		console.error(`Error executing query:\n`, sqlQuery);
		throw error;
	}
}

/**
 * Executes an SQL query and retrieves the rows returned;
 * @param {string} sqlQuery The SQL query executing.
 * @returns {Promise<{[key: string]: any;}[]>} The retrieved rows
 */
async function getRowsOfQuery(sqlQuery) {
	const queryResult = await executeQuery(sqlQuery);
	const returnedRows = queryResult.rows;
	return returnedRows;
}

/**
 * Executes an SQL query and retrieves the first value of the first row returned.
 * @param {string} sqlQuery The SQL query executing.
 * @returns {Promise<any>} The first value of the first row.
 */
async function getFirstValueOfQuery(sqlQuery) {
	const returnedRows = await getRowsOfQuery(sqlQuery);

	if (returnedRows.length <= 0) return undefined;

	const firstRow = returnedRows[0];
	if (typeof firstRow !== 'object') return undefined;

	const firstRowValues = Object.values(firstRow);
	if (firstRowValues.length <= 0) return undefined;

	return firstRowValues[0];
}

module.exports = {executeSQLFile, executeQuery, getFirstValueOfQuery, getRowsOfQuery}