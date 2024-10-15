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

describe('getRowsOfQuery', () => {
	it('SHOULD return an array of all retrieved rows', async () => {
		const retrievedRows  = await dbUtils.getRowsOfQuery('SELECT VERSION()');

		expect(retrievedRows).to.be.a('array');
		expect(retrievedRows).to.have.lengthOf(1);

		const firstRow = retrievedRows[0];
		expect(firstRow).to.be.a('object');
		expect(firstRow).to.have.property('version')
		expect(firstRow['version']).to.be.a('string')
	})
})

describe('getFirstRowOfQuery', () => {
	it('SHOULD return an array of all retrieved rows', async () => {
		const firstRow  = await dbUtils.getFirstRowOfQuery('SELECT VERSION()');

		expect(firstRow).to.be.a('object');
		expect(firstRow).to.have.property('version')
		expect(firstRow['version']).to.be.a('string')
	})

	it('SHOULD return undefined if retrieved no rows', async () => {
		const firstRow = await dbUtils.getFirstRowOfQuery('SELECT * FROM tasks WHERE id = -1');

		expect(firstRow).to.be.undefined;
	})
})

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