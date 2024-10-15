import dbUtils from '../modules/db-utils.js';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

await dbUtils.executeSQLFile('cleanup_tables.sql');
await dbUtils.executeSQLFile('create_tables.sql');
await dbUtils.executeSQLFile('delete_data.sql');
await dbUtils.executeSQLFile('insert_data.sql');