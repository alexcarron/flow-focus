import taskUtils from '../modules/task-utils.js';
import { expect } from 'chai';

describe('getTasks', () => {
	it('SHOULD return all task rows', async () => {
		const allTasks = await taskUtils.getTasks();

		expect(allTasks).to.be.a('array');
		expect(allTasks).to.have.length.greaterThan(0);
		expect(allTasks).to.all.have.keys([
			'id',
			'action',
			'start_time',
			'end_time',
			'deadline',
			'min_duration',
			'max_duration',
			'repeat_interval',
			'is_mandatory',
			'is_complete',
			'is_skipped',
			'last_actioned_step_position',
		]);
	});
});