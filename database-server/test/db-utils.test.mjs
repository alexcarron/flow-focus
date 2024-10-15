import dbUtils from '../modules/db-utils.js';
import { expect } from 'chai';

describe('executeSQLFile', () => {
	it('SHOULD return version WHEN passed get_version.sql', async () => {
		const result = await dbUtils.executeSQLFile('get_version.sql');
		const rows = result.rows;
		const firstRow = rows[0];
		const version = firstRow['version'];
		expect(version).to.be.a('string');
	});
});

describe('getFirstValueOfQuery', () => {
	it('SHOULD return first value of first row', async () => {
		const version = await dbUtils.getFirstValueOfQuery('SELECT VERSION()');
		expect(version).to.be.a('string');
	});

	it('SHOULD return undefined if returned no rows', async () => {
		const firstValue = await dbUtils.getFirstValueOfQuery('SELECT * FROM tasks WHERE id = -1');
		expect(firstValue).to.be.undefined;
	});

	it('SHOULD return undefined if returned no values in first row', async () => {
		const firstValue = await dbUtils.getFirstValueOfQuery('SELECT NULL as null_column FROM tasks WHERE FALSE');
		expect(firstValue).to.be.undefined;
	});

	it('SHOULD throw error if query is invalid', async () => {
		try {
			await dbUtils.getFirstValueOfQuery('SELECT fake_column FROM fake_table WHERE SYNTAX; ERROR');
			throw new Error('Expected error was not thrown');
		}
		catch (error) {
			expect(error).to.be.an.instanceof(Error);
		}
	});
});