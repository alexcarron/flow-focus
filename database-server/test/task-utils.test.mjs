import taskUtils from '../modules/task-utils.js';
import dbUtils from '../modules/db-utils.js';
import { expect } from 'chai';

describe('getTasks', () => {
	it('SHOULD return all task rows', async () => {
		const allTasks = await taskUtils.getTasks();

		expect(allTasks).to.be.a('array');
		expect(allTasks).to.have.length.greaterThan(0);
		expect(allTasks).to.all.have.keys(taskUtils.COLUMN_NAMES);
	});
});

describe('getTask', () => {
	it('SHOULD return the task row with id 1', async () => {
		const task1 = await taskUtils.getTask(1);

		expect(task1).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(task1.id).to.equal(1);
		expect(task1.action).to.equal('Apply New Concepts to Flow Focus');
	});

	it('SHOULD return undefined with invalid id', async () => {
		const task1 = await taskUtils.getTask(-1);

		expect(task1).to.be.undefined;
	});
});

describe('addTask', () => {
	it('SHOULD add task with default values', async () => {
		const task = await taskUtils.addTask({
			action: 'Complete This Task'
		});

		expect(task).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(task.action).to.equal('Complete This Task');
		expect(task.start_time).to.be.null;
		expect(task.end_time).to.be.null;
		expect(task.deadline).to.be.null;
		expect(task.min_duration).to.be.null;
		expect(task.max_duration).to.be.null;
		expect(task.repeat_interval).to.be.null;
		expect(task.is_mandatory).to.be.false;
		expect(task.is_complete).to.be.false;
		expect(task.is_skipped).to.be.false;
		expect(task.last_actioned_step_position).to.be.null;

		const stepRows = await dbUtils.getRowsOfQuery(
			"SELECT * FROM steps WHERE task_id = ${task_id}",
			{'task_id': task.id}
		);

		expect(stepRows).to.not.be.undefined;
		expect(stepRows).to.have.lengthOf(0);
	});

	it('SHOULD add step rows when steps are defined', async () => {
		const taskAction = 'Complete This Task';
		const taskSteps = ['Finish this first step', 'Finish this second step', 'Finish this third step'];

		const task = await taskUtils.addTask({
			action: taskAction,
			steps: taskSteps,
		});

		expect(task).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(task.action).to.equal(taskAction);
		expect(task.start_time).to.be.null;
		expect(task.end_time).to.be.null;
		expect(task.deadline).to.be.null;
		expect(task.min_duration).to.be.null;
		expect(task.max_duration).to.be.null;
		expect(task.repeat_interval).to.be.null;
		expect(task.is_mandatory).to.be.false;
		expect(task.is_complete).to.be.false;
		expect(task.is_skipped).to.be.false;
		expect(task.last_actioned_step_position).to.be.null;

		const stepRows = await dbUtils.getRowsOfQuery(
			"SELECT * FROM steps WHERE task_id = ${task_id}",
			{'task_id': task.id}
		);

		expect(stepRows).to.not.be.undefined;
		expect(stepRows).to.have.lengthOf(3);
		expect(stepRows).to.all.have.property('instruction');

		const stepInstructions = stepRows.map(stepRow => stepRow.instruction);
		expect(stepInstructions).to.have.members(taskSteps);
	});

	it('SHOULD add correct values for all columns', async () => {
		const taskAction = 'Complete This Task';
		const taskSteps = ['Finish this first step', 'Finish this second step', 'Finish this third step'];
		const taskStartTimeString = '2024-10-10T09:00:00Z';
		const taskEndTimeString = '2024-10-15T17:00:00Z';
		const taskDeadlineString = '2024-10-10T23:59:59Z';
		const taskMinDuration = '1 day 2:03:04';
		const taskMaxDuration = '2 years 15 months 100 weeks 99 hours 123456789 milliseconds';
		const taskRepreatInterval = 'P0001-02-03T04:05:06';
		const taskIsMandatory = true;
		const taskIsComplete = true;
		const taskIsSkipped = true;
		const taskLastActionedStepPosition = 1;

		const task = await taskUtils.addTask({
			action: taskAction,
			steps: taskSteps,
			startTime: taskStartTimeString,
			endTime: taskEndTimeString,
			deadline: taskDeadlineString,
			minDuration: taskMinDuration,
			maxDuration: taskMaxDuration,
			repeatInterval: taskRepreatInterval,
			isMandatory: taskIsMandatory,
			isComplete: taskIsComplete,
			isSkipped: taskIsSkipped,
			lastActionedStepPosition: taskLastActionedStepPosition,
		});

		console.log(task.max_duration);

		expect(task).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(task.action).to.equal(taskAction);
		expect(task.start_time).to.deep.equal(new Date(taskStartTimeString));
		expect(task.end_time).to.deep.equal(new Date(taskEndTimeString));
		expect(task.deadline).to.deep.equal(new Date(taskDeadlineString));
		expect(task.min_duration).to.deep.include(
			{days: 1, hours: 2, minutes: 3, seconds: 4}
		);
		expect(task.max_duration).to.deep.include(
			{years: 3, months: 3, days: 700, hours: 133, minutes: 17, seconds: 36, milliseconds: 789}
		);
		expect(task.repeat_interval).to.deep.include(
			{years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6}
		);
		expect(task.is_mandatory).to.be.equal(taskIsMandatory);
		expect(task.is_complete).to.be.equal(taskIsComplete);
		expect(task.is_skipped).to.be.equal(taskIsSkipped);
		expect(task.last_actioned_step_position).to.be.equal(taskLastActionedStepPosition);
	});
});

describe('updateTask', () => {
	it('SHOULD update only specified values', async () => {
		const newTaskAction = 'Complete This Task';

		const oldTask = await taskUtils.getTask(1);
		const updatedTask = await taskUtils.updateTask({
			id: 1,
			action: newTaskAction,
		});

		expect(updatedTask).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(updatedTask.id).to.equal(1);
		expect(updatedTask.action).to.equal(newTaskAction);
		expect(updatedTask.start_time).to.deep.equal(oldTask.start_time);
		expect(updatedTask.end_time).to.deep.equal(oldTask.end_time);
		expect(updatedTask.deadline).to.deep.equal(oldTask.deadline);
		expect(updatedTask.min_duration).to.deep.equal(oldTask.min_duration);
		expect(updatedTask.max_duration).to.deep.equal(oldTask.max_duration);
		expect(updatedTask.repeat_interval).to.deep.equal(oldTask.repeat_interval);
		expect(updatedTask.is_mandatory).to.be.equal(oldTask.is_mandatory);
		expect(updatedTask.is_complete).to.be.equal(oldTask.is_complete);
		expect(updatedTask.is_skipped).to.be.equal(oldTask.is_skipped);
		expect(updatedTask.last_actioned_step_position).to.be.equal(oldTask.last_actioned_step_position);

		const stepRows = await dbUtils.getRowsOfQuery(
			"SELECT * FROM steps WHERE task_id = ${task_id}",
			{'task_id': updatedTask.id}
		);

		expect(stepRows).to.not.be.undefined;
		expect(stepRows).to.have.lengthOf(14);
	});

	it('SHOULD update all columns', async () => {
		const newTaskAction = 'Complete This Task';
		const taskSteps = ['Finish this first step', 'Finish this second step', 'Finish this third step'];
		const taskStartTimeString = '2024-10-10T09:00:00Z';
		const taskEndTimeString = '2024-10-15T17:00:00Z';
		const taskDeadlineString = '2024-10-10T23:59:59Z';
		const taskMinDuration = '1 day 2:03:04';
		const taskMaxDuration = '2 years 15 months 100 weeks 99 hours 123456789 milliseconds';
		const taskRepreatInterval = 'P0001-02-03T04:05:06';
		const taskIsMandatory = true;
		const taskIsComplete = true;
		const taskIsSkipped = true;
		const taskLastActionedStepPosition = 1;

		const updatedTask = await taskUtils.updateTask({
			id: 1,
			action: newTaskAction,
			steps: taskSteps,
			startTime: taskStartTimeString,
			endTime: taskEndTimeString,
			deadline: taskDeadlineString,
			minDuration: taskMinDuration,
			maxDuration: taskMaxDuration,
			repeatInterval: taskRepreatInterval,
			isMandatory: taskIsMandatory,
			isComplete: taskIsComplete,
			isSkipped: taskIsSkipped,
			lastActionedStepPosition: taskLastActionedStepPosition,
		});

		expect(updatedTask).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(updatedTask.id).to.equal(1);
		expect(updatedTask.action).to.equal(newTaskAction);
		expect(updatedTask.start_time).to.deep.equal(new Date(taskStartTimeString));
		expect(updatedTask.end_time).to.deep.equal(new Date(taskEndTimeString));
		expect(updatedTask.deadline).to.deep.equal(new Date(taskDeadlineString));
		expect(updatedTask.min_duration).to.deep.include(
			{days: 1, hours: 2, minutes: 3, seconds: 4}
		);
		expect(updatedTask.max_duration).to.deep.include(
			{years: 3, months: 3, days: 700, hours: 133, minutes: 17, seconds: 36, milliseconds: 789}
		);
		expect(updatedTask.repeat_interval).to.deep.include(
			{years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6}
		);
		expect(updatedTask.is_mandatory).to.be.equal(taskIsMandatory);
		expect(updatedTask.is_complete).to.be.equal(taskIsComplete);
		expect(updatedTask.is_skipped).to.be.equal(taskIsSkipped);
		expect(updatedTask.last_actioned_step_position).to.be.equal(taskLastActionedStepPosition);

		const stepRows = await dbUtils.getRowsOfQuery(
			"SELECT * FROM steps WHERE task_id = ${task_id}",
			{'task_id': updatedTask.id}
		);

		expect(stepRows).to.not.be.undefined;
		expect(stepRows).to.have.lengthOf(3);
		expect(stepRows).to.all.have.property('instruction');

		const stepInstructions = stepRows.map(stepRow => stepRow.instruction);
		expect(stepInstructions).to.have.members(taskSteps);
	});
});

describe('deleteTask', () => {
	it('SHOULD remove task from database', async () => {
		const deletedTask = await taskUtils.deleteTask(7);

		expect(deletedTask).to.have.keys(taskUtils.COLUMN_NAMES);
		expect(deletedTask.id).to.equal(7);

		const task = await taskUtils.getTask(7);
		expect(task).to.be.undefined;

		const stepRows = await dbUtils.getRowsOfQuery(
			"SELECT * FROM steps WHERE task_id = ${task_id}",
			{'task_id': deletedTask.id}
		);
		expect(stepRows).to.have.lengthOf(0);
	});

	it('SHOULD do nothing with invalid id', async () => {
		const deletedTask = await taskUtils.deleteTask(-10);
		expect(deletedTask).to.be.undefined;
	});
});