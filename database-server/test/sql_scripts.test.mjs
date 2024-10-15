import dbUtils from '../modules/db-utils.js';
import { expect } from 'chai';

describe('cleanup_tables.sql', () => {
	it('SHOULD delete all tables', async () => {
		await dbUtils.executeSQLFile('create_tables.sql');
		await dbUtils.executeSQLFile('cleanup_tables.sql');

		expect(dbUtils.executeQuery('SELECT * FROM tasks')).to.eventually.throw(Error);
		expect(dbUtils.executeQuery('SELECT * FROM steps')).to.eventually.throw(Error);
	});

	it('SHOULD not throw error when called twice', async () => {
		await dbUtils.executeSQLFile('create_tables.sql');

		await dbUtils.executeSQLFile('cleanup_tables.sql');
		await dbUtils.executeSQLFile('cleanup_tables.sql');
	});
});

describe('create_tables.sql', () => {
	it('SHOULD create all tables', async () => {
		await dbUtils.executeSQLFile('cleanup_tables.sql');
		await dbUtils.executeSQLFile('create_tables.sql');

		expect(dbUtils.executeQuery('SELECT * FROM tasks')).to.eventually.not.throw(Error);
		expect(dbUtils.executeQuery('SELECT * FROM steps')).to.eventually.not.throw(Error);
	});

	it('SHOULD not throw error when called twice', async () => {
		await dbUtils.executeSQLFile('cleanup_tables.sql');

		await dbUtils.executeSQLFile('create_tables.sql');
		await dbUtils.executeSQLFile('create_tables.sql');
	});
});

describe('delete_data.sql', () => {
	it('SHOULD delete all rows of every table', async () => {
		await dbUtils.executeSQLFile('create_tables.sql');
		await dbUtils.executeSQLFile('insert_data.sql');
		await dbUtils.executeSQLFile('delete_data.sql');

		expect(await dbUtils.getFirstValueOfQuery('SELECT COUNT(*) FROM tasks')).to.equal('0');
		expect(await dbUtils.getFirstValueOfQuery('SELECT COUNT(*) FROM steps')).to.equal('0');
	});

	it('SHOULD not throw error WHEN called twice', async () => {
		await dbUtils.executeSQLFile('create_tables.sql');
		await dbUtils.executeSQLFile('insert_data.sql');

		await dbUtils.executeSQLFile('delete_data.sql');
		await dbUtils.executeSQLFile('delete_data.sql');
	});
});

describe('insert_data.sql', () => {
	it('SHOULD insert data into every able', async () => {
		await dbUtils.executeSQLFile('create_tables.sql');
		await dbUtils.executeSQLFile('delete_data.sql');
		await dbUtils.executeSQLFile('insert_data.sql');

		expect(await dbUtils.getFirstValueOfQuery('SELECT COUNT(*) FROM tasks')).to.not.equal('0');
		expect(await dbUtils.getFirstValueOfQuery('SELECT COUNT(*) FROM steps')).to.not.equal('0');
	});

	it('SHOULD throw error when called twice', async () => {
		await dbUtils.executeSQLFile('create_tables.sql');
		await dbUtils.executeSQLFile('delete_data.sql');
		await dbUtils.executeSQLFile('insert_data.sql');
		expect(dbUtils.executeSQLFile('insert_data.sql')).to.eventually.throw(Error);
	});
});