import dbUtils from '../modules/db-utils.js';

await dbUtils.executeSQLFile('cleanup_tables.sql');
await dbUtils.executeSQLFile('create_tables.sql');
await dbUtils.executeSQLFile('delete_data.sql');
await dbUtils.executeSQLFile('insert_data.sql');