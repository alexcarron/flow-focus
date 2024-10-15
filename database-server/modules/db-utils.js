const connectionPool = require("./create-db-connection");
const fs = require('fs');
const path = require('path');

const SQL_SCRIPTS_DIRECTORY = 'sql_scripts';

/**
 * Executes an SQL file and retrieves the result.
 * @param {string} sqlFileName - The name of the SQL file including the extension.
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
 * Converts named parameters in a template string to positional parameters.
 *
 * Takes a template string containing named parameters (in the format "${paramName}") and an object mapping those named parameters to their respective values, replacing each named parameter with its positional counterpart (e.g., `$1`, `$2`, etc.) and returns an object containing the formatted text and an array of parameter values.
 *
 * @param {string} templateText - The template string with named parameters to be formatted.
 * @param {{[parameterKey: string]: any}} parametersToValues - An object mapping parameter names to their corresponding values.
 * @returns {{ text: string, values: Array }} An object containing:
 *   - text: The formatted string with positional parameters.
 *   - values: An array of values corresponding to the named parameters in the order they were found.
 *
 * @throws {Error} Throws an error if a named parameter in the template is not found in the values object.
 */
function getPositionalParamsFromNamed(templateText, parametersToValues) {
	const parameterKeys = Object.keys(parametersToValues)
	const formattedText = templateText.replace(/\${(.*?)}/g,
		(_, parameterKey) => {
			if (parametersToValues.hasOwnProperty(parameterKey)) {
				const parameterIndex = parameterKeys.indexOf(parameterKey)
				return `$${parameterIndex + 1}`;
			}
			throw new Error(`Key '${parameterKey}' not found in values object`);
		}
	);

	// Extract the values into an array
	const parameterValues = parameterKeys.map(parameterKey => parametersToValues[parameterKey]);

	return { text: formattedText, values: parameterValues };
}

/**
 * Execute an SQL query.
 * @param {string} sqlQuery - The SQL query executing.
 * @param {{[parameterKey: string]: any} | undefined} parametersToValues - An object mapping parameter names to their corresponding values. undefined by default.
 * @returns {Promise<import("pg").QueryResult>} A result object including information about the outcome of that query.
 */
async function executeQuery(sqlQuery, parametersToValues=undefined) {
	console.log(parametersToValues);
	let parameterValues;

	if (parametersToValues !== undefined) {
		const positionalParameterizedQuery = getPositionalParamsFromNamed(sqlQuery, parametersToValues);
		console.log(positionalParameterizedQuery);
		sqlQuery = positionalParameterizedQuery.text;
		parameterValues = positionalParameterizedQuery.values;
	}

	try {
		const result = await connectionPool.query(sqlQuery, parameterValues);
		console.log(
			`> ${sqlQuery}`,
			parameterValues ? `\n  [${parameterValues}]` : ""
		);
		return result;
	}
	catch (error) {
		console.error(
			`Error executing query:\n`, sqlQuery,
			parameterValues ? `\n  [${parameterValues}]` : ""
		);
		throw error;
	}
}

/**
 * Executes an SQL query and retrieves the rows returned.
 * @param {string} sqlQuery - The SQL query executing.
 * @param {{[parameterKey: string]: any} | undefined} parametersToValues - An object mapping parameter names to their corresponding values. undefined by default.
 * @returns {Promise<{[key: string]: any;}[]>} The retrieved rows
 */
async function getRowsOfQuery(sqlQuery, parametersToValues=undefined) {
	const queryResult = await executeQuery(sqlQuery, parametersToValues);
	const returnedRows = queryResult.rows;
	return returnedRows;
}

/**
 * Executes an SQL query and retrieves the first row of the rows returned.
 * @param {string} sqlQuery - The SQL query executing.
 * @param {{[parameterKey: string]: any} | undefined} parametersToValues - An object mapping parameter names to their corresponding values. undefined by default.
 * @returns {Promise<{[key: string]: any;}[]>} The first row retrieved
 */
async function getFirstRowOfQuery(sqlQuery, parametersToValues=undefined) {
	const returnedRows = await getRowsOfQuery(sqlQuery, parametersToValues);
	if (returnedRows.length <= 0) return undefined;

	return returnedRows[0];
}

/**
 * Executes an SQL query and retrieves the first value of the first row returned.
 * @param {string} sqlQuery - The SQL query executing.
 * @param {{[parameterKey: string]: any} | undefined} parametersToValues - An object mapping parameter names to their corresponding values. undefined by default.
 * @returns {Promise<any>} The first value of the first row.
 */
async function getFirstValueOfQuery(sqlQuery, parametersToValues=undefined) {
	const firstRow = await getFirstRowOfQuery(sqlQuery, parametersToValues);
	if (typeof firstRow !== 'object') return undefined;

	const firstRowValues = Object.values(firstRow);
	if (firstRowValues.length <= 0) return undefined;

	return firstRowValues[0];
}

module.exports = {executeSQLFile, executeQuery, getFirstValueOfQuery, getFirstRowOfQuery, getRowsOfQuery}