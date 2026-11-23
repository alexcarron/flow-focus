import { immerable } from 'immer';
import TaskTimingOptions from "./TaskTimingOptions";
import TasksManager from "../TasksManager";
import DateRange from "../time-management/DateRange";
import StepStatus from "./step/StepStatus";
import Step from "./step/Step";
import { createStep, cloneStepsDeep, getStepLeavesInOrder, rollUpStepStatuses, setSubtreeStatus, setSingleStepStatus, areAllStepLeavesCompleted, areAllStepLeavesActioned, uncompleteAllSteps, convertPastedListItemsIntoSteps, insertStepsAfterStepReplacingItIfBlank } from "./step/stepTree";
import { getAncestorIDs, getSubtreeIDsIncludingSelf, findNodeWithParent, mapNode, indentNode, unindentNode, canIndentNode, canUnindentNode, moveNodeAmongSiblings, reparentAndReorderNode, insertSiblingRelativeToNode, appendRootNode, deleteNode, getNodeIDsInDepthFirstOrder } from "../../utilities/tree/orderedTree";
import { PastedListItem } from "../../utilities/parsePastedTextIntoNestedListItems";
import TaskState from "./TaskState";
import { StartDateAfterTargetDateError, StartDateAfterDueDateError, TargetDateAfterDueDateError, SkipUntilDateInPastError, RecurringTaskInSequenceError } from "./TaskTimingError";
import RecurrenceDuration, { areRecurrenceDurationsEqual, cloneRecurrenceDuration, getWeekdaysOfRecurrenceDuration } from "./recurrence/RecurrenceDuration";
import TaskOccurrence from "./recurrence/TaskOccurrence";
import { computeCurrentTaskOccurrence, getOccurrenceStartDate, TaskRecurrenceSnapshot } from "./recurrence/computeTaskOccurrence";
import { moveAnchorOccurrenceToFirstRecurrenceWeekday } from "./recurrence/recurrenceWeekdayOccurrences";
import { calculateSequenceDueDateSlack, getPrerequisiteTasksOfTask, hasIncompletePrerequisiteTask, isTaskInSequence } from "./sequence/taskSequence";

const FIRST_OCCURRENCE_INDEX = 0;

export default class Task {
	static [immerable] = true;

	readonly id: string;
	readonly createdAt: Date;

	protected description: string;
	protected steps: Step[] = [];
	protected startDate: Date | null = null;
	protected targetDate: Date | null = null;
	protected dueDate: Date | null = null;
	protected minRequiredTime: number | null = null;
	protected maxRequiredTime: number | null = null;
	protected recurrenceDuration: RecurrenceDuration | null = null;
	protected shouldNotSkipMissedOccurrences: boolean = false;
	protected completedOccurrenceIndex: number | null = null;
	protected skippedOccurrenceIndex: number | null = null;
	protected progressOccurrenceIndex: number | null = null;
	protected currentOccurrence: TaskOccurrence | null = null;
	protected isComplete: boolean = false;
	protected isSkipped: boolean = false;
	protected skippedUntil: Date | null = null;
	protected lastActionedStep: {stepID: string, status: StepStatus} | null = null;
	protected tagIDs: string[] = [];
	protected prerequisiteTaskIDs: string[] = [];

	constructor(
		protected tasksManager: TasksManager,
		description: string,
		id: string = crypto.randomUUID(),
		tagIDs: string[] = [],
		createdAt: Date = new Date(),
	) {
		this.id = id;
		this.description = description;
		this.tagIDs = tagIDs;
		this.createdAt = createdAt;
	}

	getDescription(): string {return this.description};

	setDescription(description: string): void {this.description = description};

	replaceAllSteps(steps: Step[]): void {
		this.steps = steps;
	};

	hasSingletonDuration(): boolean {
		return this.minRequiredTime === this.maxRequiredTime;
	}

	static assertStartDateNotAfterTargetDate(startDate: Date | null, targetDate: Date | null): void {
		if (startDate !== null && targetDate !== null && startDate.getTime() > targetDate.getTime()) {
			throw new StartDateAfterTargetDateError(startDate, targetDate);
		}
	}

	static assertStartDateNotAfterDueDate(startDate: Date | null, dueDate: Date | null): void {
		if (startDate !== null && dueDate !== null && startDate.getTime() > dueDate.getTime()) {
			throw new StartDateAfterDueDateError(startDate, dueDate);
		}
	}

	static assertTargetDateNotAfterDueDate(targetDate: Date | null, dueDate: Date | null): void {
		if (targetDate !== null && dueDate !== null && targetDate.getTime() > dueDate.getTime()) {
			throw new TargetDateAfterDueDateError(targetDate, dueDate);
		}
	}

	static assertDatesInOrder({ startDate, targetDate, dueDate }: {
		startDate: Date | null,
		targetDate: Date | null,
		dueDate: Date | null,
	}): void {
		Task.assertStartDateNotAfterTargetDate(startDate, targetDate);
		Task.assertStartDateNotAfterDueDate(startDate, dueDate);
		Task.assertTargetDateNotAfterDueDate(targetDate, dueDate);
	}

	getStartDate(): Date | null {
		if (this.currentOccurrence !== null) return this.currentOccurrence.startDate;
		return this.startDate;
	}

	getAnchorStartDate(): Date | null {return this.startDate}

	setStartDate(startDate: Date | null): void {this.startDate = startDate};

	getTargetDate(): Date | null {
		if (this.currentOccurrence !== null) return this.currentOccurrence.targetDate;
		return this.targetDate;
	}

	getAnchorTargetDate(): Date | null {return this.targetDate}

	setTargetDate(targetDate: Date | null): void {this.targetDate = targetDate};

	getDueDate(): Date | null {
		if (this.currentOccurrence !== null) return this.currentOccurrence.dueDate;
		return this.dueDate;
	}

	getAnchorDueDate(): Date | null {return this.dueDate}

	setDueDate(dueDate: Date | null): void {this.dueDate = dueDate};

	getMinRequiredTime(): number {
		if (this.minRequiredTime === null) {
			return 0;
		}
		return this.minRequiredTime
	};

	setMinRequiredTime(minRequiredTime: number | null): void {this.minRequiredTime = minRequiredTime};

	hasMaxRequiredTime(): boolean {
		return this.maxRequiredTime !== null;
	}

	getMaxRequiredTime(currentTime: Date): number {
		if (this.maxRequiredTime === null) {
			return this.getTimeToCompleteByTargetOrDueDate(currentTime);
		}
		return this.maxRequiredTime
	};

	setMaxRequiredTime(maxRequriedTime: number | null): void {this.maxRequiredTime = maxRequriedTime};

	getAssumedMaxRequiredTime(): number {
		if (this.maxRequiredTime === null) {
			return this.getMinRequiredTime();
		}
		return this.maxRequiredTime;
	}

	getRecurrenceDuration(): RecurrenceDuration | null {return this.recurrenceDuration};

	setRecurrenceDuration(recurrenceDuration: RecurrenceDuration | null): void {this.recurrenceDuration = recurrenceDuration};

	getShouldNotSkipMissedOccurrences(): boolean {return this.shouldNotSkipMissedOccurrences}

	setShouldNotSkipMissedOccurrences(shouldNotSkipMissedOccurrences: boolean): void {this.shouldNotSkipMissedOccurrences = shouldNotSkipMissedOccurrences}

	getCompletedOccurrenceIndex(): number | null {return this.completedOccurrenceIndex}

	setCompletedOccurrenceIndex(completedOccurrenceIndex: number | null): void {this.completedOccurrenceIndex = completedOccurrenceIndex}

	getSkippedOccurrenceIndex(): number | null {return this.skippedOccurrenceIndex}

	setSkippedOccurrenceIndex(skippedOccurrenceIndex: number | null): void {this.skippedOccurrenceIndex = skippedOccurrenceIndex}

	getProgressOccurrenceIndex(): number | null {return this.progressOccurrenceIndex}

	setProgressOccurrenceIndex(progressOccurrenceIndex: number | null): void {this.progressOccurrenceIndex = progressOccurrenceIndex}

	getIsComplete(): boolean {
		if (this.currentOccurrence !== null) {
			return this.completedOccurrenceIndex === this.currentOccurrence.index;
		}
		return this.isComplete;
	}

	setComplete(isComplete: boolean, currentTime: Date = new Date()): void {
		this.isComplete = isComplete;
		if (isComplete) this.setSkippedUntil(null);

		if (this.currentOccurrence === null) return;

		if (isComplete) {
			this.completedOccurrenceIndex = this.currentOccurrence.index;
		}
		else if (this.completedOccurrenceIndex === this.currentOccurrence.index) {
			this.completedOccurrenceIndex = this.getIndexOfOccurrenceBefore(this.currentOccurrence.index);
		}
		this.refreshCurrentOccurrence(currentTime);
	}

	protected getIndexOfOccurrenceBefore(occurrenceIndex: number): number | null {
		if (occurrenceIndex <= FIRST_OCCURRENCE_INDEX) return null;
		return occurrenceIndex - 1;
	}

	getIsSkipped(): boolean {return this.isSkipped}

	setSkipped(isSkipped: boolean): void {this.isSkipped = isSkipped}

	getSkippedUntil(): Date | null {return this.skippedUntil}

	setSkippedUntil(skippedUntil: Date | null): void {this.skippedUntil = skippedUntil}

	skipUntil(skipUntilDate: Date, currentTime: Date = new Date()): void {
		if (skipUntilDate.getTime() <= currentTime.getTime()) {
			throw new SkipUntilDateInPastError(skipUntilDate, currentTime);
		}
		this.setSkippedUntil(skipUntilDate);
	}

	cancelSkip(): void {
		this.setSkippedUntil(null);
	}

	setLastActionedStep(lastActionedStep: {stepID: string, status: StepStatus} | null): void {this.lastActionedStep = lastActionedStep};

	getTagIDs(): string[] {return [...this.tagIDs]};

	addTagID(tagID: string): void {
		if (this.tagIDs.includes(tagID)) return;
		this.tagIDs = [...this.tagIDs, tagID];
	}

	removeTagID(tagID: string): void {
		this.tagIDs = this.tagIDs.filter(existingTagID => existingTagID !== tagID);
	}

	getPrerequisiteTaskIDs(): string[] {return [...this.prerequisiteTaskIDs]};

	addPrerequisiteTaskID(prerequisiteTaskID: string): void {
		if (this.prerequisiteTaskIDs.includes(prerequisiteTaskID)) return;
		this.prerequisiteTaskIDs = [...this.prerequisiteTaskIDs, prerequisiteTaskID];
	}

	removePrerequisiteTaskID(prerequisiteTaskID: string): void {
		this.prerequisiteTaskIDs = this.prerequisiteTaskIDs.filter(existingPrerequisiteTaskID => existingPrerequisiteTaskID !== prerequisiteTaskID);
	}

	protected assertCanBecomeRecurring(): void {
		if (this.isRecurring()) return;
		const tasks = this.tasksManager.getTasks();
		if (isTaskInSequence({ task: this, tasks })) {
			const doesTaskWaitForOtherTasks = getPrerequisiteTasksOfTask({ task: this, tasks }).length > 0;
			throw new RecurringTaskInSequenceError({ doesTaskWaitForOtherTasks });
		}
	}

	isRecurring(): boolean {return this.recurrenceDuration !== null};

	getCurrentOccurrence(): TaskOccurrence | null {return this.currentOccurrence}

	protected getRecurrenceSnapshot(): TaskRecurrenceSnapshot | null {
		if (this.recurrenceDuration === null || this.startDate === null) return null;
		return {
			anchorStartDate: this.startDate,
			anchorTargetDate: this.targetDate,
			anchorDueDate: this.dueDate,
			recurrenceDuration: this.recurrenceDuration,
			completedOccurrenceIndex: this.completedOccurrenceIndex,
			skippedOccurrenceIndex: this.skippedOccurrenceIndex,
			shouldNotSkipMissedOccurrences: this.shouldNotSkipMissedOccurrences,
		};
	}

	refreshCurrentOccurrence(currentTime: Date): void {
		const recurrenceSnapshot = this.getRecurrenceSnapshot();
		if (recurrenceSnapshot === null) {
			this.currentOccurrence = null;
			return;
		}

		this.currentOccurrence = computeCurrentTaskOccurrence(recurrenceSnapshot, currentTime);

		if (this.progressOccurrenceIndex !== this.currentOccurrence.index) {
			this.resetProgress();
			this.progressOccurrenceIndex = this.currentOccurrence.index;
		}
	}

	protected static fitTargetAndDueDatesIntoFirstOccurrence(parameters: {
		anchorStartDate: Date,
		recurrenceDuration: RecurrenceDuration,
		targetDate: Date | null,
		dueDate: Date | null,
	}): { targetDate: Date | null; dueDate: Date | null } {
		const nextOccurrenceStartDate = getOccurrenceStartDate({
			anchorStartDate: parameters.anchorStartDate,
			recurrenceDuration: parameters.recurrenceDuration,
		}, 1);
		const moveDateIntoFirstOccurrence = (date: Date | null): Date | null => {
			if (date === null) return null;
			if (date.getTime() > nextOccurrenceStartDate.getTime()) return nextOccurrenceStartDate;
			return date;
		};

		if (parameters.targetDate === null && parameters.dueDate === null) {
			return {
				targetDate: nextOccurrenceStartDate,
				dueDate: null,
			};
		}
		return {
			targetDate: moveDateIntoFirstOccurrence(parameters.targetDate),
			dueDate: moveDateIntoFirstOccurrence(parameters.dueDate),
		};
	}

	protected static moveAnchorOccurrenceToFirstWeekdayOfRecurrence(parameters: {
		startDate: Date;
		targetDate: Date | null;
		dueDate: Date | null;
		recurrenceDuration: RecurrenceDuration;
	}): { startDate: Date; targetDate: Date | null; dueDate: Date | null } {
		const weekdays = getWeekdaysOfRecurrenceDuration(parameters.recurrenceDuration);
		if (weekdays.length === 0) {
			return {
				startDate: parameters.startDate,
				targetDate: parameters.targetDate,
				dueDate: parameters.dueDate,
			};
		}
		return moveAnchorOccurrenceToFirstRecurrenceWeekday({
			startDate: parameters.startDate,
			targetDate: parameters.targetDate,
			dueDate: parameters.dueDate,
			weekdays,
		});
	}

	makeRecurring(recurrenceDuration: RecurrenceDuration, requestedAnchorStartDate: Date, currentTime: Date = new Date()): void {
		this.assertCanBecomeRecurring();
		const movedAnchorOccurrence = Task.moveAnchorOccurrenceToFirstWeekdayOfRecurrence({
			startDate: requestedAnchorStartDate,
			targetDate: this.targetDate,
			dueDate: this.dueDate,
			recurrenceDuration,
		});
		const anchorStartDate = movedAnchorOccurrence.startDate;
		const anchorTargetAndDueDates = Task.fitTargetAndDueDatesIntoFirstOccurrence({
			anchorStartDate,
			recurrenceDuration,
			targetDate: movedAnchorOccurrence.targetDate,
			dueDate: movedAnchorOccurrence.dueDate,
		});

		Task.assertDatesInOrder({
			startDate: anchorStartDate,
			targetDate: anchorTargetAndDueDates.targetDate,
			dueDate: anchorTargetAndDueDates.dueDate,
		});

		this.setRecurrenceDuration(recurrenceDuration);
		this.setStartDate(anchorStartDate);
		this.setTargetDate(anchorTargetAndDueDates.targetDate);
		this.setDueDate(anchorTargetAndDueDates.dueDate);
		this.setCompletedOccurrenceIndex(this.isComplete ? FIRST_OCCURRENCE_INDEX : null);
		this.setSkippedOccurrenceIndex(null);
		this.setProgressOccurrenceIndex(FIRST_OCCURRENCE_INDEX);
		this.refreshCurrentOccurrence(currentTime);
	};

	makeNonRecurring(): void {
		const isCurrentOccurrenceComplete = this.getIsComplete();
		this.setStartDate(this.getStartDate());
		this.setTargetDate(this.getTargetDate());
		this.setDueDate(this.getDueDate());
		this.setRecurrenceDuration(null);
		this.setCompletedOccurrenceIndex(null);
		this.setSkippedOccurrenceIndex(null);
		this.setProgressOccurrenceIndex(null);
		this.currentOccurrence = null;
		this.isComplete = isCurrentOccurrenceComplete;
	};

	skipCurrentOccurrence(currentTime: Date = new Date()): void {
		if (this.currentOccurrence === null) return;
		this.setSkippedOccurrenceIndex(this.currentOccurrence.index);
		this.refreshCurrentOccurrence(currentTime);
	}

	protected reanchorToCurrentOccurrence(): void {
		if (this.currentOccurrence === null) return;

		const currentIndex = this.currentOccurrence.index;
		this.setStartDate(this.currentOccurrence.startDate);
		this.setTargetDate(this.currentOccurrence.targetDate);
		this.setDueDate(this.currentOccurrence.dueDate);
		this.setCompletedOccurrenceIndex(this.completedOccurrenceIndex === currentIndex ? FIRST_OCCURRENCE_INDEX : null);
		this.setSkippedOccurrenceIndex(this.skippedOccurrenceIndex === currentIndex ? FIRST_OCCURRENCE_INDEX : null);
		this.setProgressOccurrenceIndex(FIRST_OCCURRENCE_INDEX);
	}

	protected resetProgress() {
		this.steps = uncompleteAllSteps(this.steps);
		this.setSkipped(false);
		this.setSkippedUntil(null);
		this.setLastActionedStep(null);
	}

	getSteps(): Step[] {
		return [...this.steps];
	};

	protected hasSteps(): boolean {
		return this.steps.length > 0;
	};

	hasNextStep(): boolean {
		return this.getNextStep() !== null;
	};

	protected getLeafSteps(): Step[] {
		return getStepLeavesInOrder(this.steps);
	}

	getFirstNotCompletedStep(): Step | null {
		return this.getLeafSteps().find(step => step.status !== StepStatus.COMPLETED) ?? null;
	}

	getFirstUncompleteStep(): Step | null {
		return this.getLeafSteps().find(step => step.status === StepStatus.UNCOMPLETE) ?? null;
	}

	getNextSkippedStep(): Step | null {
		if (this.lastActionedStep === null) {
			return null;
		}

		const lastActionedStepID = this.lastActionedStep.stepID;

		let foundLastActionedStep = false;

		const nextSkippedStep = this.getLeafSteps().find((step) => {
			if (foundLastActionedStep) {
				return step.status === StepStatus.SKIPPED && step.id !== lastActionedStepID;
			}

			if (step.id === lastActionedStepID) {
				foundLastActionedStep = true;
			}

			return false;
		});

		return nextSkippedStep ?? null;
	}

	getNextStep(): Step | null {
		if (this.wasLastActionASkip()) {
			const nextSkippedStep = this.getNextSkippedStep();
			const firstUncompletedStep = this.getFirstUncompleteStep();

			if (nextSkippedStep) {
				return nextSkippedStep;
			}
			else if (firstUncompletedStep) {
				return firstUncompletedStep;
			}
			else {
				return this.getFirstNotCompletedStep();
			}
		}
		else {
			return this.getFirstNotCompletedStep();
		}
	};

	protected getLeafStepIndex(stepID: string): number {
		return this.getLeafSteps().findIndex(step => step.id === stepID);
	}

	getCurrentAndAncestorStepIDs(): Set<string> {
		const nextStep = this.getNextStep();
		if (nextStep === null) return new Set();
		return new Set([nextStep.id, ...getAncestorIDs(this.steps, nextStep.id)]);
	}

	getStepDepth(stepID: string): number {
		return getAncestorIDs(this.steps, stepID).length;
	}

	removeDueDate(): void {
		this.setDueDate(null);
	}

	removeStartDate(): void {
		this.setStartDate(null);
	}

	isStepComplete(stepID: string) {
		return findNodeWithParent(this.steps, stepID)?.node.status === StepStatus.COMPLETED
	}

	hasTaskStarted(currentTime: Date): boolean {
		const startDate = this.getStartDate();
		return startDate === null || startDate <= currentTime;
	}

	replaceNextStep(newStepText: string) {
		const nextStep = this.getNextStep();
		if (nextStep === null) return;

		this.editStepText(nextStep.id, newStepText);
		this.steps = setSingleStepStatus(this.steps, nextStep.id, StepStatus.UNCOMPLETE);
	};

	addStep(text: string): Step {
		const newStep = createStep(text);
		this.steps = appendRootNode(this.steps, newStep);
		return newStep;
	};

	createStepLeftOfStep(adjacentStepID: string): Step {
		const newStep = createStep("");
		if (findNodeWithParent(this.steps, adjacentStepID) === null) {
			this.steps = appendRootNode(this.steps, newStep);
		}
		else {
			this.steps = insertSiblingRelativeToNode(this.steps, adjacentStepID, 'before', newStep);
		}
		return newStep;
	}

	createStepRightOfStep(adjacentStepID: string): Step {
		const newStep = createStep("");
		if (findNodeWithParent(this.steps, adjacentStepID) === null) {
			this.steps = appendRootNode(this.steps, newStep);
		}
		else {
			this.steps = insertSiblingRelativeToNode(this.steps, adjacentStepID, 'after', newStep);
		}
		return newStep;
	}

	insertStepsFromPastedListItems(stepID: string, pastedListItems: PastedListItem[]): string[] {
		const newSteps = convertPastedListItemsIntoSteps(pastedListItems);
		this.steps = insertStepsAfterStepReplacingItIfBlank(this.steps, stepID, newSteps);
		return getNodeIDsInDepthFirstOrder(newSteps);
	}

	protected wasLastActionASkip(): boolean {
		return this.lastActionedStep?.status === StepStatus.SKIPPED;
	}

	protected areAllStepsCompleted(): boolean {
		return areAllStepLeavesCompleted(this.steps);
	}

	completeStep(stepID: string) {
		if (findNodeWithParent(this.steps, stepID) === null) return;

		this.steps = setSubtreeStatus(this.steps, stepID, StepStatus.COMPLETED);

		if (this.areAllStepsCompleted()) {
			this.complete();
		}

		this.setLastActionedStep({
			stepID: stepID,
			status: StepStatus.COMPLETED
		});
	}

	uncompleteStep(stepID: string) {
		if (findNodeWithParent(this.steps, stepID) === null) return;

		this.steps = setSubtreeStatus(this.steps, stepID, StepStatus.UNCOMPLETE);

		if (this.getIsComplete()) {
			this.setComplete(false);
		}
	}

	completeStepAndPrecedingSteps(stepID: string) {
		const leaves = this.getLeafSteps();
		const subtreeIDs = getSubtreeIDsIncludingSelf(this.steps, stepID);
		let lastLeafIndexInSubtree = -1;
		leaves.forEach((leaf, index) => {
			if (subtreeIDs.has(leaf.id)) lastLeafIndexInSubtree = index;
		});
		if (lastLeafIndexInSubtree === -1) return;

		leaves.slice(0, lastLeafIndexInSubtree + 1).forEach(leaf => {
			if (leaf.status !== StepStatus.COMPLETED) this.completeStep(leaf.id);
		});
	}

	uncompleteStepAndFollowingSteps(stepID: string) {
		const leaves = this.getLeafSteps();
		const subtreeIDs = getSubtreeIDsIncludingSelf(this.steps, stepID);
		let firstLeafIndexInSubtree = -1;
		leaves.forEach((leaf, index) => {
			if (firstLeafIndexInSubtree === -1 && subtreeIDs.has(leaf.id)) firstLeafIndexInSubtree = index;
		});
		if (firstLeafIndexInSubtree === -1) return;

		leaves.slice(firstLeafIndexInSubtree).forEach(leaf => {
			if (leaf.status !== StepStatus.UNCOMPLETE) this.uncompleteStep(leaf.id);
		});
	}

	completeNextStep() {
		if (!this.hasSteps()) {
			this.complete();
			return;
		}

		const nextStep = this.getNextStep();
		if (nextStep) {
			this.completeStep(nextStep.id);
		}
	}

	completeAllSteps() {
		this.getLeafSteps().forEach((leaf) => {
			this.completeStep(leaf.id);
		});

		this.complete();
	}

	protected areAllStepsActioned(): boolean {
		return areAllStepLeavesActioned(this.steps);
	}

	getLastSkippedStep(): Step | null {
		return [...this.getLeafSteps()].reverse().find(step => step.status === StepStatus.SKIPPED) ?? null;
	}

	skipStep(stepID: string) {
		if (findNodeWithParent(this.steps, stepID) === null) return;

		this.steps = setSingleStepStatus(this.steps, stepID, StepStatus.SKIPPED);

		if (
			this.areAllStepsActioned() &&
			this.getLastSkippedStep()?.id === stepID
		) {
			this.skip();
		}

		this.setLastActionedStep({
			stepID: stepID,
			status: StepStatus.SKIPPED
		})
	}

	skipNextStep() {
		if (!this.hasSteps()) {
			this.skip();
			return;
		}

		const nextStep = this.getNextStep();
		if (nextStep) {
			this.skipStep(nextStep.id);
		}
	}

	editStepsText(newStepTexts: string[]): void {
		const existingLeaves = this.getLeafSteps();
		const remainingExistingLeaves = [...existingLeaves];
		const statusByPosition = existingLeaves.map(leaf => leaf.status);

		this.steps = newStepTexts.map((text, position) => {
			const matchingLeafIndex = remainingExistingLeaves.findIndex(leaf => leaf.text === text);

			if (matchingLeafIndex !== -1) {
				const [reusedLeaf] = remainingExistingLeaves.splice(matchingLeafIndex, 1);
				return { ...reusedLeaf, children: [] };
			}

			return { id: crypto.randomUUID(), text, status: statusByPosition[position] ?? StepStatus.UNCOMPLETE, children: [] };
		});
	}

	editStepText(stepID: string, newText: string) {
		this.steps = mapNode(this.steps, stepID, step => ({ ...step, text: newText }));
	}

	moveStepAmongSiblings(stepID: string, direction: 'up' | 'down'): void {
		this.steps = moveNodeAmongSiblings(this.steps, stepID, direction);
	}

	reparentStep(stepID: string, newParentID: string | null, newIndexAmongSiblings: number): void {
		this.steps = rollUpStepStatuses(reparentAndReorderNode(this.steps, stepID, newParentID, newIndexAmongSiblings));
	}

	canIndentStep(stepID: string): boolean {
		return canIndentNode(this.steps, stepID);
	}

	indentStep(stepID: string): void {
		this.steps = rollUpStepStatuses(indentNode(this.steps, stepID));
	}

	canUnindentStep(stepID: string): boolean {
		return canUnindentNode(this.steps, stepID);
	}

	unindentStep(stepID: string): void {
		this.steps = rollUpStepStatuses(unindentNode(this.steps, stepID));
	}

	deleteStep(stepID: string): void {
		this.steps = deleteNode(this.steps, stepID);
	}

	getTimeUntilDueDate(currentTime: Date): number {
		if (this.getDueDate() === null) {
			return Number.POSITIVE_INFINITY;
		}
		return this.getDueDate()!.getTime() - currentTime.getTime();
	}

	getTargetOrDueDate(): Date | null {
		return this.getTargetDate() ?? this.getDueDate();
	}

	protected getAwakeTimeAvailableBefore(date: Date | null, currentTime: Date): number {
		if (date === null) {
			return Number.POSITIVE_INFINITY;
		}

		const startDate = this.getStartDate();
		const hasNotStarted = startDate !== null && currentTime.getTime() < startDate.getTime();
		let taskDateRange = new DateRange(currentTime, date);
		if (hasNotStarted) {
			taskDateRange = new DateRange(startDate, date);
		}

		return taskDateRange.getDurationWithoutTimeWindow(
			this.tasksManager.getAsleepTimeWindow()
		);
	}

	getTimeToCompleteByDueDate(currentTime: Date): number {
		return this.getAwakeTimeAvailableBefore(this.getDueDate(), currentTime);
	}

	getTimeToCompleteByTargetOrDueDate(currentTime: Date): number {
		return this.getAwakeTimeAvailableBefore(this.getTargetOrDueDate(), currentTime);
	}

	getTaskTimingOptions(): TaskTimingOptions {
		return {
			startDate: this.getStartDate(),
			targetDate: this.getTargetDate(),
			dueDate: this.getDueDate(),
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			recurrenceDuration: this.recurrenceDuration,
			shouldNotSkipMissedOccurrences: this.shouldNotSkipMissedOccurrences,
		}
	}

	protected static areNullableDatesEqual(left: Date | null, right: Date | null): boolean {
		if (left === null || right === null) return left === right;
		return left.getTime() === right.getTime();
	}

	protected isOccurrenceScheduleChanging(taskTimingOptions: TaskTimingOptions): boolean {
		return (
			!Task.areNullableDatesEqual(taskTimingOptions.startDate, this.getStartDate()) ||
			!Task.areNullableDatesEqual(taskTimingOptions.targetDate, this.getTargetDate()) ||
			!Task.areNullableDatesEqual(taskTimingOptions.dueDate, this.getDueDate()) ||
			!areRecurrenceDurationsEqual(taskTimingOptions.recurrenceDuration, this.recurrenceDuration)
		);
	}

	protected static moveTimingOptionsAnchorToFirstRecurrenceWeekday(taskTimingOptions: TaskTimingOptions): TaskTimingOptions {
		if (taskTimingOptions.recurrenceDuration === null || taskTimingOptions.startDate === null) return taskTimingOptions;
		return {
			...taskTimingOptions,
			...Task.moveAnchorOccurrenceToFirstWeekdayOfRecurrence({
				startDate: taskTimingOptions.startDate,
				targetDate: taskTimingOptions.targetDate,
				dueDate: taskTimingOptions.dueDate,
				recurrenceDuration: taskTimingOptions.recurrenceDuration,
			}),
		};
	}

	setFromTaskTimingOptions(requestedTaskTimingOptions: TaskTimingOptions, currentTime: Date = new Date()): void {
		const wasRecurring = this.isRecurring();
		const recurrenceDuration = requestedTaskTimingOptions.recurrenceDuration;
		if (recurrenceDuration !== null) this.assertCanBecomeRecurring();
		const requestedStartDate = recurrenceDuration !== null ? requestedTaskTimingOptions.startDate ?? currentTime : requestedTaskTimingOptions.startDate;
		const taskTimingOptions = Task.moveTimingOptionsAnchorToFirstRecurrenceWeekday({
			...requestedTaskTimingOptions,
			startDate: requestedStartDate,
		});
		const finalStartDate = taskTimingOptions.startDate;

		Task.assertDatesInOrder({
			startDate: finalStartDate,
			targetDate: taskTimingOptions.targetDate,
			dueDate: taskTimingOptions.dueDate,
		});

		this.setMinRequiredTime(taskTimingOptions.minDuration);
		this.setMaxRequiredTime(taskTimingOptions.maxDuration);
		this.setShouldNotSkipMissedOccurrences(taskTimingOptions.shouldNotSkipMissedOccurrences);

		if (wasRecurring && recurrenceDuration === null) {
			this.makeNonRecurring();
		}

		if (wasRecurring && recurrenceDuration !== null) {
			if (!this.isOccurrenceScheduleChanging(taskTimingOptions)) {
				this.refreshCurrentOccurrence(currentTime);
				return;
			}
			this.reanchorToCurrentOccurrence();
		}

		this.setStartDate(finalStartDate);
		this.setTargetDate(taskTimingOptions.targetDate);
		this.setDueDate(taskTimingOptions.dueDate);

		if (recurrenceDuration === null) return;

		if (!wasRecurring) {
			this.makeRecurring(recurrenceDuration, finalStartDate as Date, currentTime);
			return;
		}

		this.setRecurrenceDuration(recurrenceDuration);
		this.refreshCurrentOccurrence(currentTime);
	}

	getDueDateSlack(currentTime: Date): number {
		return this.getTimeToCompleteByDueDate(currentTime) - this.getAssumedMaxRequiredTime();
	}

	getTargetOrDueDateSlack(currentTime: Date): number {
		return this.getTimeToCompleteByTargetOrDueDate(currentTime) - this.getAssumedMaxRequiredTime();
	}

	isUrgent(currentTime: Date): boolean {
		return calculateSequenceDueDateSlack({ task: this, tasks: this.tasksManager.getTasks(), currentTime }) <= 0;
	}

	isDueDateSlackRunningOutToday(currentTime: Date): boolean {
		const endOfToday = new Date(currentTime);
		endOfToday.setHours(23, 59, 59, 999);
		const millisecondsUntilEndOfToday = endOfToday.getTime() - currentTime.getTime();
		return calculateSequenceDueDateSlack({ task: this, tasks: this.tasksManager.getTasks(), currentTime }) <= millisecondsUntilEndOfToday;
	}

	protected complete(): void {
		this.setComplete(true);
		this.tasksManager.unSkipSkippedTasks();
	}

	protected skip(): void {
		this.setSkipped(true);
	}

	unSkip(): void {
		this.setSkipped(false);
	}

	getProgress(): number {
		if (this.getIsComplete()) {
			return 1;
		}

		const leaves = this.getLeafSteps();
		if (leaves.length === 0) {
			return 0;
		}

		const completedLeaves = leaves.filter((leaf) => leaf.status === StepStatus.COMPLETED).length;

		return completedLeaves / leaves.length;
	}

	getState(): TaskState {
		return {
			description: this.description,
			isComplete: this.isComplete,
			isSkipped: this.isSkipped,
			skippedUntil: this.skippedUntil,
			startDate: this.startDate,
			targetDate: this.targetDate,
			dueDate: this.dueDate,
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			recurrenceDuration: this.recurrenceDuration === null ? null : cloneRecurrenceDuration(this.recurrenceDuration),
			shouldNotSkipMissedOccurrences: this.shouldNotSkipMissedOccurrences,
			completedOccurrenceIndex: this.completedOccurrenceIndex,
			skippedOccurrenceIndex: this.skippedOccurrenceIndex,
			progressOccurrenceIndex: this.progressOccurrenceIndex,
			steps: cloneStepsDeep(this.steps),
			lastActionedStep: this.lastActionedStep,
			tagIDs: [...this.tagIDs],
			prerequisiteTaskIDs: [...this.prerequisiteTaskIDs],
		};
	}

	restoreState(taskState: TaskState, currentTime: Date = new Date()) {
		Task.assertDatesInOrder({
			startDate: taskState.startDate,
			targetDate: taskState.targetDate,
			dueDate: taskState.dueDate,
		});

		this.setDescription(taskState.description);
		this.isComplete = taskState.isComplete;
		this.setSkipped(taskState.isSkipped);
		this.setSkippedUntil(taskState.skippedUntil);
		this.setStartDate(taskState.startDate);
		this.setTargetDate(taskState.targetDate);
		this.setDueDate(taskState.dueDate);
		this.setMinRequiredTime(taskState.minDuration);
		this.setMaxRequiredTime(taskState.maxDuration);
		this.setRecurrenceDuration(taskState.recurrenceDuration === null ? null : cloneRecurrenceDuration(taskState.recurrenceDuration));
		this.setShouldNotSkipMissedOccurrences(taskState.shouldNotSkipMissedOccurrences);
		this.setCompletedOccurrenceIndex(taskState.completedOccurrenceIndex);
		this.setSkippedOccurrenceIndex(taskState.skippedOccurrenceIndex);
		this.setProgressOccurrenceIndex(taskState.progressOccurrenceIndex);
		this.replaceAllSteps(cloneStepsDeep(taskState.steps));
		this.setLastActionedStep(taskState.lastActionedStep);
		this.tagIDs = [...taskState.tagIDs];
		this.prerequisiteTaskIDs = [...taskState.prerequisiteTaskIDs];
		this.refreshCurrentOccurrence(currentTime);
	}

	isActive(currentTime: Date): boolean {
		if (
			this.skippedUntil !== null &&
			this.skippedUntil > currentTime
		) {
			return false;
		}

		return this.isActiveIgnoringSkip(currentTime);
	}

	isActiveIgnoringSkip(currentTime: Date): boolean {
		return (
			!this.getIsComplete() &&
			this.hasTaskStarted(currentTime) &&
			!hasIncompletePrerequisiteTask({ task: this, tasks: this.tasksManager.getTasks() })
		);
	}

	mustStartToday(currentTime: Date): boolean {
		return this.isActive(currentTime) && this.isDueDateSlackRunningOutToday(currentTime);
	}
}
