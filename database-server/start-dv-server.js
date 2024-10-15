const dbUtils = require("./modules/db-utils");

async function recreateTables() {
	await dbUtils.executeSQLFile('cleanup_tables.sql');
	await dbUtils.executeSQLFile('create_tables.sql');
	await dbUtils.executeSQLFile('delete_data.sql');
	await dbUtils.executeSQLFile('insert_data.sql');
}

recreateTables();
