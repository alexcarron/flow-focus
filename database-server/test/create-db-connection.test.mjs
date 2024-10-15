import connectionPool from '../modules/create-db-connection.js';
import { expect } from 'chai';

describe('connectionPool', () => {
	it('SHOULD be conencted to test database', async () => {
		console.log(connectionPool.options);
		expect(connectionPool.options.database).to.equal('test-flow-focus')
	});
});