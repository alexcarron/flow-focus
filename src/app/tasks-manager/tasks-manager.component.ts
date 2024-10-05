import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import TasksManager from '../../model/TasksManager';
import Task from '../../model/task/Task';
import { FormsModule } from '@angular/forms';
import { DateFormatterPipe } from '../../pipes/DateFormatter.pipe';
import Duration from '../../model/time-management/Duration';
import { CheckboxInputComponent } from '../input-controls/checkbox-input/checkbox-input.component';
import { TextInputComponent } from '../input-controls/text-input/text-input.component';
import { TaskTimingOptionsPopupComponent } from '../base-popup/task-timing-options-popup/task-timing-options-popup.component';

enum Filter {
	None,
	Active,
	MustStartToday
}

const filterToFunction: Record<Filter, (tasks: Task[]) => Task[]> = {
	[Filter.None]: (tasks: Task[]) => tasks,
	[Filter.Active]: (tasks: Task[]) => tasks.filter(
		task => task.isActive(new Date())
	),
	[Filter.MustStartToday]: (tasks: Task[]) => tasks.filter(task =>
		task.mustStartToday(new Date())
	)
};

@Component({
  selector: 'app-tasks-manager',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, DateFormatterPipe, CheckboxInputComponent, TextInputComponent, TaskTimingOptionsPopupComponent],
  templateUrl: './tasks-manager.component.html',
  styleUrl: './tasks-manager.component.css'
})
export class TasksManagerComponent {
	@ViewChild('timingOptionsPopup') timingOptionsPopup?: TaskTimingOptionsPopupComponent;

	tasksManager!: TasksManager;
	currentFilter: Filter = Filter.None;

	constructor(
		private activatedRoute: ActivatedRoute
	) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];
	}

	getTasks(): Task[] {
		const tasksInPriorityOrder = this.tasksManager.getTasksInPriorityOrder(new Date());
		const filterFunction = filterToFunction[this.currentFilter];
		return filterFunction(tasksInPriorityOrder);
	}

	getCurrentTime(): Date {
		return new Date();
	}

	/**
	 * Cycles through all the different task filters
	 */
	toggleFliter(): void {
		const oldFilterNum = this.currentFilter;
		const numFilters = Object.keys(Filter).length / 2;
		const newFilterNum = (oldFilterNum + 1) % numFilters;
		this.currentFilter = newFilterNum;
	}

	willTaskBeAlwaysAvailable(task: Task): boolean {
		return task.willAlwaysBeAvailable(new Date());
	}

	getTaskStartTime(task: Task): Date | null {
		const startTime = task.getStartTime();

		if (startTime === null || startTime <= new Date()) {
			return null;
		}

		return startTime;
	}

	getDurationRangeStrings(startMilliseconds: number, endMilliseconds: number) {
		const startDuration = Duration.fromMilliseconds(startMilliseconds)
		const endDuration = Duration.fromMilliseconds(endMilliseconds)
		return Duration.getDurationRangeStrings(startDuration, endDuration);
	}

	toDurationString(milliseconds: number) {
		const duration = Duration.fromMilliseconds(milliseconds);
		const amount = duration.getAmountOfUnits();
		if (amount === 1)
			return duration.getTimeUnit().name.slice(0, -1);

		return `${amount} ${duration.getTimeUnit().name}`
	}

	onCompleteChange(task: Task, isComplete: boolean) {
		task.setComplete(isComplete);
	}

	onMandatoryChange(task: Task, isMandatory: boolean) {
		task.setMandatory(isMandatory);
	}

	onDescriptionChange(task: Task, newDescription: string | null) {
		if (newDescription === null) return;

		task.setDescription(newDescription);
	}

	trackStepByIndex(index: number): number {
		return index;
	}

	onStepChange(task: Task, oldStep: string, newStep: string | null) {
		if (newStep === null) return;

		console.log({task, oldStep, newStep});
		task.editStep(oldStep, newStep);
		console.log(task.getSteps());
	}

	openTimingOptionsPopup(task: Task): void {
		if (this.timingOptionsPopup) {
			this.timingOptionsPopup.open();
			this.timingOptionsPopup.setTask(task);
		}
	}

	deleteTask(task: Task) {
		console.log("Deleting", task);
		this.tasksManager.deleteTask(task);
	}
}
