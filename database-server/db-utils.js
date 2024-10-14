const connectionPool = require("./create-db-connection");
const fs = require('fs');
const path = require('path');

const SQL_SCRIPTS_DIRECTORY = 'sql_scripts';

async function executeSQLFile(sqlFileName) {
	try {
		const sqlFilePath = path.resolve(__dirname, SQL_SCRIPTS_DIRECTORY, sqlFileName)
		const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

		const result = await connectionPool.query(sqlQuery);
		console.log(`Executed SQL File ${sqlFileName}`);
		return result
	}
	catch (error) {

		console.error(`Error executing SQL file ${sqlFileName}`);
		throw error;
	}
}

module.exports = {executeSQLFile}