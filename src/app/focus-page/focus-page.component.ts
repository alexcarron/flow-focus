import { Component, HostListener } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import Task from '../../model/Task';

@Component({
  selector: 'focus-page',
  standalone: true,
  imports: [TaskComponent, CommonModule],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.css'
})
export class FocusPageComponent {
	tasksManager!: TasksManager;

	constructor(private activatedRoute: ActivatedRoute) {}

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

	private complete() {
		this.getNextTask()?.complete();
	}

	private lastPointerDownTime = 0;
	private clickCount = 0;
	private static readonly DOUBLE_TAP_THRESHOLD = 400;

  @HostListener('pointerdown', ['$event'])
  onTouchStart(event: PointerEvent): void {
		console.log("Click")
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

		setTimeout(() => {
			if (
				!targetElement.hasAttribute('contenteditable') &&
				!targetElement.matches('button, input, select, textarea') &&
				!this.isTextSelected()
			) {
				this.complete();
			}
		}, FocusPageComponent.TEXT_SELECTION_DELAY);
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
