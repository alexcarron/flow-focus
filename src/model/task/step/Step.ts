import StepStatus from "./StepStatus";
import { OrderedTreeNode } from "../../../utilities/tree/orderedTree";

export default interface Step extends OrderedTreeNode<Step> {
	id: string;
	text: string;
	status: StepStatus;
	children: Step[];
}
