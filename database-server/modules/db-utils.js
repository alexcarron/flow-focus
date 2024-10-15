const connectionPool = require("./create-db-connection");
const fs = require('fs');
const path = require('path');

const SQL_SCRIPTS_DIRECTORY = 'sql_scripts';
const DEFAULT = Symbol('default');
const DEFAULT_STRING = 'DEFAULT'

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
 * Removes leading tabs from a string while keeping tabs relative to the base.
 *
 * @param {string} string - The string from which to remove leading tabs.
 * @returns {string} - The modified string with leading tabs removed.
 */
function removeLeadingTabs(string) {
	const lines = string.split('\n');

	// Remove leading empty lines
	let startIndex = 0;
	while (startIndex < lines.length && lines[startIndex].trim() === '') {
			startIndex++;
	}

	// Remove trailing empty lines
	let endIndex = lines.length - 1;
	while (endIndex >= 0 && lines[endIndex].trim() === '') {
			endIndex--;
	}

	// Slice the lines array to only include non-empty lines
	const nonEmptyLines = lines.slice(startIndex, endIndex + 1);

	// Find the minimum number of leading tabs
	const minLeadingTabs = nonEmptyLines
			.map(line => line.match(/^(\t*)/)[0].length) // Get leading tabs count
			.reduce((min, count) => Math.min(min, count), Infinity);

	// Remove leading tabs based on the minimum count
	const modifiedLines = nonEmptyLines.map(line => {
			return line.replace(new RegExp(`^\\t{0,${minLeadingTabs}}`), '');
	});

	// Join the modified lines back into a single string
	return modifiedLines.join('\n');
}

/**
 * Inserts default values into a SQL query template and removes corresponding parameters. It replaces named parameters with the default value in the SQL query template with DEFAULT.
 *
 * @param {string} sqlQuery - The SQL query template containing named parameters (e.g., `${paramName}`).
 * @param {{[parameterKey: string]: any}} parametersToValues - An object mapping parameter names to their corresponding values.
 * @returns {{templateText: string, parametersToValues: Object}}
 *   An object containing:
 *   - `templateText`: The formatted SQL query with parameter values inserted, and defaults where applicable.
 *   - `parametersToValues`: The modified object with parameters that had a default value removed.
 *
 * @throws {Error} If a parameter in the template is not found in the `parametersToValues` object.
 */
function insertDefaultParamtersInQuery(sqlQuery, parametersToValues) {
	const parameterKeysToRemove = []

	const formattedQuery = sqlQuery.replace(/\${(.*?)}/g,
		(originalParameter, parameterKey) => {
			if (parametersToValues.hasOwnProperty(parameterKey)) {
				const parameterValue = parametersToValues[parameterKey];

				if (parameterValue === DEFAULT) {
					parameterKeysToRemove.push(parameterKey);
					return DEFAULT_STRING;
				}
				else {
					return originalParameter;
				}
			}
			throw new Error(`Key '${parameterKey}' not found in values object`);
		}
	);

	for (const parameterKeyToRemove of parameterKeysToRemove) {
		delete parametersToValues[parameterKeyToRemove];
	}

	return {templateText: formattedQuery, parametersToValues}
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
	let parameterValues;

	if (parametersToValues !== undefined) {
		const parameterizedQuery = insertDefaultParamtersInQuery(sqlQuery, parametersToValues);
		sqlQuery = parameterizedQuery.templateText;
		parametersToValues = parameterizedQuery.parametersToValues;

		const positionalParameterizedQuery = getPositionalParamsFromNamed(sqlQuery, parametersToValues);
		sqlQuery = positionalParameterizedQuery.text;
		parameterValues = positionalParameterizedQuery.values;
	}

	try {
		const result = await connectionPool.query(sqlQuery, parameterValues);
		console.log(
			`> ${removeLeadingTabs(sqlQuery)}`,
			parameterValues ? `\n  [${parameterValues}]\n` : ""
		);
		return result;
	}
	catch (error) {
		console.error(
			`Error executing query:\n`, removeLeadingTabs(sqlQuery),
			parameterValues ? `\n  [${parameterValues}]\n` : ""
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

module.exports = {DEFAULT, executeSQLFile, executeQuery, getFirstValueOfQuery, getFirstRowOfQuery, getRowsOfQuery}