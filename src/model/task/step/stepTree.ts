import Step from './Step';
import StepStatus from './StepStatus';
import { getLeavesInDepthFirstOrder, insertNodesAfterNodeReplacingItIfBlank, mapEveryNode, mapNode } from '../../../utilities/tree/orderedTree';
import { PastedListItem } from '../../../utilities/parsePastedTextIntoNestedListItems';

export function createStep(text: string): Step {
	return { id: crypto.randomUUID(), text, status: StepStatus.UNCOMPLETE, children: [] };
}

export function convertPastedListItemsIntoSteps(pastedListItems: PastedListItem[]): Step[] {
	return pastedListItems.map(pastedListItem => ({
		...createStep(pastedListItem.text),
		status: pastedListItem.isChecked ? StepStatus.COMPLETED : StepStatus.UNCOMPLETE,
		children: convertPastedListItemsIntoSteps(pastedListItem.children),
	}));
}

export function insertStepsAfterStepReplacingItIfBlank(tree: Step[], stepID: string, newSteps: Step[]): Step[] {
	return rollUpStepStatuses(insertNodesAfterNodeReplacingItIfBlank(tree, stepID, newSteps));
}

export function cloneStepsDeep(tree: Step[]): Step[] {
	return tree.map(step => ({ ...step, children: cloneStepsDeep(step.children) }));
}

export function getStepLeavesInOrder(tree: Step[]): Step[] {
	return getLeavesInDepthFirstOrder(tree);
}

function collectDescendantLeafStatuses(step: Step): StepStatus[] {
	if (step.children.length === 0) return [step.status];
	return step.children.flatMap(collectDescendantLeafStatuses);
}

function deriveStatusFromDescendantLeaves(step: Step): StepStatus {
	const leafStatuses = collectDescendantLeafStatuses(step);
	if (leafStatuses.every(status => status === StepStatus.COMPLETED)) return StepStatus.COMPLETED;
	if (leafStatuses.some(status => status === StepStatus.UNCOMPLETE)) return StepStatus.UNCOMPLETE;
	return StepStatus.SKIPPED;
}

export function rollUpStepStatuses(tree: Step[]): Step[] {
	return mapEveryNode(tree, (step, rolledUpChildren) => {
		if (rolledUpChildren.length === 0) return step;
		const stepWithRolledUpChildren = { ...step, children: rolledUpChildren };
		return { ...stepWithRolledUpChildren, status: deriveStatusFromDescendantLeaves(stepWithRolledUpChildren) };
	});
}

function setStatusRecursively(step: Step, status: StepStatus): Step {
	return { ...step, status, children: step.children.map(child => setStatusRecursively(child, status)) };
}

export function uncompleteAllSteps(tree: Step[]): Step[] {
	return tree.map(step => setStatusRecursively(step, StepStatus.UNCOMPLETE));
}

export function setSubtreeStatus(tree: Step[], stepID: string, status: StepStatus): Step[] {
	return rollUpStepStatuses(mapNode(tree, stepID, step => setStatusRecursively(step, status)));
}

export function setSingleStepStatus(tree: Step[], stepID: string, status: StepStatus): Step[] {
	return rollUpStepStatuses(mapNode(tree, stepID, step => ({ ...step, status })));
}

export function areAllStepLeavesCompleted(tree: Step[]): boolean {
	return getStepLeavesInOrder(tree).every(leaf => leaf.status === StepStatus.COMPLETED);
}

export function areAllStepLeavesActioned(tree: Step[]): boolean {
	return getStepLeavesInOrder(tree).every(leaf => leaf.status !== StepStatus.UNCOMPLETE);
}

export function pruneEmptySteps(tree: Step[]): Step[] {
	const result: Step[] = [];
	for (const step of tree) {
		const children = pruneEmptySteps(step.children);
		const trimmedText = step.text.trim();
		if (trimmedText !== '' || children.length > 0) {
			result.push({ ...step, text: trimmedText, children });
		}
	}
	return result;
}
