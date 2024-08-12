import { Injectable } from '@angular/core';
import UndoableCommand from '../model/commands/UndoableCommand';

@Injectable({
  providedIn: 'root'
})
export class CommandHistoryService {
	private commandsToUndo: UndoableCommand[] = [];
	private commandsToRedo: UndoableCommand[] = [];

  constructor() {}

	private displayCommands(): void {
	}

	public execute(command: UndoableCommand): void {
		this.commandsToUndo.push(command);
		command.execute();

		this.displayCommands();
		this.commandsToRedo = [];
	}

	public undo(): void {
		if (this.commandsToUndo.length > 0) {
			const undoneCommand = this.commandsToUndo.pop();

			if (undoneCommand !== undefined) {
				this.commandsToRedo.push(undoneCommand);
				undoneCommand.undo();
			}
		}

		this.displayCommands();
	}

	public redo(): void {
		if (this.commandsToRedo.length > 0) {
			const undoneCommand = this.commandsToRedo.pop();

			if (undoneCommand !== undefined) {
				this.commandsToUndo.push(undoneCommand);
				undoneCommand.redo();
			}
		}

		this.displayCommands();
	}
}