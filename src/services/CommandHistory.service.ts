import { Injectable } from '@angular/core';
import UndoableCommand from '../model/command/UndoableCommand';

@Injectable({
  providedIn: 'root'
})
export class CommandHistoryService {
	private doneCommands: UndoableCommand[] = [];
	private undoneCommands: UndoableCommand[] = [];

  constructor() {}

	private displayCommands(): void {
		let stringToDisplay = "\n\n";

		stringToDisplay += "Done Commands: \n";
		this.doneCommands.forEach((command) => {
			stringToDisplay += command.toString() + "\n";
		})

		stringToDisplay += "\nUndone Commands: \n";
		this.undoneCommands.forEach((command) => {
			stringToDisplay += command.toString() + "\n";
		})

		console.log(stringToDisplay);
	}

	public execute(command: UndoableCommand): void {
		this.doneCommands.push(command);
		command.redo();

		this.displayCommands();
	}

	public undo(): void {
		if (this.doneCommands.length > 0) {
			const undoneCommand = this.doneCommands.pop();

			if (undoneCommand !== undefined) {
				this.undoneCommands.push(undoneCommand);
				undoneCommand.undo();
			}
		}

		this.displayCommands();
	}

	public redo(): void {
		if (this.undoneCommands.length > 0) {
			const undoneCommand = this.undoneCommands.pop();

			if (undoneCommand !== undefined) {
				this.doneCommands.push(undoneCommand);
				undoneCommand.redo();
			}
		}

		this.displayCommands();
	}
}
