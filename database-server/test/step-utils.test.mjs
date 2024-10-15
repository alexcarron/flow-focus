import stepUtils from '../modules/step-utils.js';
import { expect } from 'chai';

describe('getSteps', () => {
	it('SHOULD return all step rows', async () => {
		const allSteps = await stepUtils.getSteps();

		expect(allSteps).to.be.a('array');
		expect(allSteps).to.have.length.greaterThan(0);
		expect(allSteps).to.all.have.keys(stepUtils.COLUMN_NAMES);
	});
});

describe('getStepsOfTask', () => {
	it('SHOULD return the step rows of only that task', async () => {
		const steps = await stepUtils.getStepsOfTask(1);

		expect(steps).to.all.have.keys(stepUtils.COLUMN_NAMES);
		expect(steps).to.have.lengthOf(14);
		expect(steps).to.all.have.property('task_id', 1);
	});

	it('SHOULD return an empty array for a task with no steps', async () => {
		const steps = await stepUtils.getStepsOfTask(2);
		expect(steps).to.have.lengthOf(0);
	});

	it('SHOULD return an empty array for an invalid task id', async () => {
		const steps = await stepUtils.getStepsOfTask(-2);
		expect(steps).to.have.lengthOf(0);
	});
});

describe('getStep', () => {
	it('SHOULD return the associated step row', async () => {
		const step = await stepUtils.getStep(1, 3);

		expect(step).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(step.task_id).to.equal(1);
		expect(step.position).to.equal(3);
		expect(step.instruction).to.equal('Create Python server w/ rebuild tables test');
	});

	it('SHOULD return undefined with invalid task id', async () => {
		const step = await stepUtils.getStep(-1, 3);

		expect(step).to.be.undefined;
	});

	it('SHOULD return undefined with invalid position id', async () => {
		const step = await stepUtils.getStep(1, -3);

		expect(step).to.be.undefined;
	});
});


describe('addStep', () => {
	it('SHOULD add step with default values', async () => {
		const step = await stepUtils.addStep({
			taskId: 9,
			position: 7,
			instruction: 'A new step',
		});

		expect(step).to.be.a('object')
		expect(step).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(step.task_id).to.equal(9);
		expect(step.position).to.equal(7);
		expect(step.instruction).to.equal('A new step');
		expect(step.status).to.equal('UNCOMPLETED');
	});

	it('SHOULD add step with step status', async () => {
		const step = await stepUtils.addStep({
			taskId: 9,
			position: 8,
			instruction: 'A new step',
			status: 'SKIPPED',
		});

		expect(step).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(step.task_id).to.equal(9);
		expect(step.position).to.equal(8);
		expect(step.instruction).to.equal('A new step');
		expect(step.status).to.equal('SKIPPED');
	});

	it('SHOULD throw error when no taskId', async () => {
		expect(stepUtils.addStep({
			position: 8,
			instruction: 'A new step',
			status: 'SKIPPED',
		}))
			.to.eventually.throw(Error);
	});

	it('SHOULD to add to latest position whe no position', async () => {
		const step = await stepUtils.addStep({
			taskId: 12,
			instruction: 'A new step',
			status: 'SKIPPED',
		});

		expect(step).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(step.task_id).to.equal(12);
		expect(step.position).to.equal(6);
		expect(step.instruction).to.equal('A new step');
		expect(step.status).to.equal('SKIPPED');
	});
});


describe('getNumStepsInTask', () => {
	it('SHOULD get number of steps in task', async () => {
		const numSteps = await stepUtils.getNumStepsInTask(13);
		expect(numSteps).to.equal(12);
	});

	it('SHOULD return 0 for task with no steps', async () => {
		const numSteps = await stepUtils.getNumStepsInTask(10);
		expect(numSteps).to.equal(0);
	});

	it('SHOULD throw error with invalid task', async () => {
		expect(stepUtils.getNumStepsInTask(-13)).to.eventually.throw(Error);
	});
});

describe('updateStep', () => {
	it('SHOULD update only specified values', async () => {
		const newTaskInstruction = 'New Instruction';

		const oldStep = await stepUtils.getStep(1, 4);
		const updatedStep = await stepUtils.updateStep({
			taskId: 1,
			position: 4,
			instruction: newTaskInstruction,
		});

		expect(updatedStep).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(updatedStep.task_id).to.equal(1);
		expect(updatedStep.position).to.equal(4);
		expect(updatedStep.instruction).to.equal(newTaskInstruction);
		expect(updatedStep.status).to.equal(oldStep.status);
	});

	it('SHOULD update all columns', async () => {
		const newTaskInstruction = 'New Instruction';
		const newTaskStatus = 'COMPLETED';

		const updatedStep = await stepUtils.updateStep({
			taskId: 1,
			position: 4,
			instruction: newTaskInstruction,
			status: newTaskStatus,
		});

		expect(updatedStep).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(updatedStep.task_id).to.equal(1);
		expect(updatedStep.position).to.equal(4);
		expect(updatedStep.instruction).to.equal(newTaskInstruction);
		expect(updatedStep.status).to.equal(newTaskStatus);
	});

	it('SHOULD throw error when task id not specified', async () => {
		const newTaskInstruction = 'New Instruction';
		const newTaskStatus = 'COMPLETED';

		expect(stepUtils.updateStep({
			position: 4,
			instruction: newTaskInstruction,
			status: newTaskStatus,
		}))
			.to.eventually.throw(Error);
	});

	it('SHOULD throw error when positoin not specified', async () => {
		const newTaskInstruction = 'New Instruction';
		const newTaskStatus = 'COMPLETED';

		expect(stepUtils.updateStep({
			taskId: 4,
			instruction: newTaskInstruction,
			status: newTaskStatus,
		}))
			.to.eventually.throw(Error);
	});
});

describe('deleteStep', () => {
	it('SHOULD remove step from database', async () => {
		const deletedTask = await stepUtils.deleteStep(7, 5);

		expect(deletedTask).to.have.keys(stepUtils.COLUMN_NAMES);
		expect(deletedTask.task_id).to.equal(7);
		expect(deletedTask.position).to.equal(5);

		const step = await stepUtils.getStep(7, 5);
		expect(step).to.be.undefined;
	});

	it('SHOULD do nothing with invalid task id', async () => {
		const deletedStep = await stepUtils.deleteStep(-1, 5);
		expect(deletedStep).to.be.undefined;
	});

	it('SHOULD do nothing with invalid position', async () => {
		const deletedStep = await stepUtils.deleteStep(7, -5);
		expect(deletedStep).to.be.undefined;
	});
});