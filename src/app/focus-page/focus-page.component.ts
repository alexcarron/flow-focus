import { Component, HostListener } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import Task from '../../model/Task';
import { CommandHistoryService } from '../../services/CommandHistory.service';
import CompleteTaskCommand from '../../model/command/CompleteTaskCommand';

@Component({
  selector: 'focus-page',
  standalone: true,
  imports: [TaskComponent, CommonModule],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.css'
})
export class FocusPageComponent {
	tasksManager!: TasksManager;

	constructor(
		private activatedRoute: ActivatedRoute,
		private commandHistory: CommandHistoryService,
	) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];

		setInterval(() => {
			this.tasksManager.update(new Date());
		}, 1000);
	}

	getNextTask(): Task| null {
		const currentTime = new Date();
		return this.tasksManager.getPriorityTask(currentTime);
	}

  private isTextSelected(): boolean {
    const selection = window.getSelection();

		if (!selection) {
			return false;
		}

    return selection.toString().trim().length > 0;
  }

	onTaskSkipped(task: Task) {
		console.log("Skipped");
	}

	onTaskCompleted(task: Task) {
		this.complete(task);
	}

	private complete(task?: Task) {
		let taskToComplete: Task | null = null;

		if (task) {
			taskToComplete = task;
		}
		else {
			taskToComplete = this.getNextTask();
		}


		if (taskToComplete !== null) {
			const command = new CompleteTaskCommand(taskToComplete);
			this.commandHistory.execute(command);
		}
	}

	private lastPointerDownTime = 0;
	private clickCount = 0;
	private static readonly DOUBLE_TAP_THRESHOLD = 400;

  @HostListener('pointerdown', ['$event'])
  onTouchStart(event: PointerEvent): void {
		if (this.isTextSelected()) {
			return;
		}

		this.clickCount++;

		const currentTime = new Date().getTime();
		const isSequentialClick = () => {
			return currentTime - this.lastPointerDownTime < FocusPageComponent.DOUBLE_TAP_THRESHOLD;
		}

		if (!isSequentialClick()) {
			this.clickCount = 1;
		}

    if (this.clickCount === 2) {
      this.onDoubleClick(event);
    }

    this.lastPointerDownTime = currentTime;
  }

	private static readonly TEXT_SELECTION_DELAY = 50;
  onDoubleClick(event: PointerEvent | MouseEvent | TouchEvent): void {
    const targetElement = event.target as HTMLElement;

		if (
			!targetElement.hasAttribute('contenteditable') &&
			!targetElement.matches('button, input, select, textarea')
		) {
			this.complete();
		}
  }

  @HostListener('window:keydown', ['$event'])
  onKeyPress(event: KeyboardEvent): void {
    if (
			event.key === 'Enter' &&
			!event.ctrlKey &&
			!event.shiftKey &&
			!event.altKey &&
			!event.metaKey
		) {
			this.complete();
		}
  }
}
