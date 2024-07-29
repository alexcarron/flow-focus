export default interface UndoableCommand {
	execute(): void;
	undo(): void;
	redo(): void;
	toString(): string;
}