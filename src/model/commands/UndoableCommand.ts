export default interface UndoableCommand {
	undo(): void;
	redo(): void;
	toString(): string;
}