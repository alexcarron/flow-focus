import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FocusPageComponent } from './focus-page/focus-page.component';
import { CommandHistoryService } from '../services/CommandHistory.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FocusPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

	constructor(
		private commandHistory: CommandHistoryService
	) {}

	// Listen for Ctrl+Z for undoing commands
	@HostListener('window:keydown', ['$event'])
	onKeydown(event: KeyboardEvent) {
		// Listen for Ctrl+Z for undoing commands
		if (
			event.ctrlKey &&
			event.key.toLowerCase() === 'z' &&
			!event.altKey &&
			!event.shiftKey &&
			!event.metaKey
		) {
			this.commandHistory.undo();
			console.log("Undo")
		}

		// Listen for Ctrl+Y or Ctrl+Shift+Z or Ctrl+Alt+Z or Ctrl+Meta+Z for redoing commands
		if (
			(
				event.ctrlKey &&
				event.key === 'y'
			) ||
			(
				event.ctrlKey &&
				event.key.toLowerCase() === 'z' &&
				(event.altKey || event.shiftKey || event.metaKey)
			)
		) {
			this.commandHistory.redo();
			console.log("Redo")
		}
	}
}