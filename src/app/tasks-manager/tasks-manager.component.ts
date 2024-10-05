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

enum SortBy {
	Priority,
	Name,
	Steps,
	TimeAvailable,
	Duration,
	RepeatInterval
}

enum SortDirection {
	Ascending,
	Descending
}

const filterToFunction: Record<Filter, (tasks: Task[]) => Task[]> = {
	[Filter.None]: (tasks: Task[]) => tasks,
	[Filter.Active]: (tasks: Task[]) => tasks.filter(
		task => task.isActive(new Date()) && task.getDeadline() !== null
	),
	[Filter.MustStartToday]: (tasks: Task[]) => tasks.filter(task =>
		task.mustStartToday(new Date())
	)
};

const sortByToFunction: Record<SortBy, (tasks: Task[], currentTime: Date) => Task[]> = {
	[SortBy.Priority]: (tasks: Task[], currentTime: Date) => tasks,
	[SortBy.Name]: (tasks: Task[], currentTime: Date) => [...tasks].sort((a, b) =>
		a.getDescription().localeCompare(b.getDescription())
	),
	[SortBy.Steps]: (tasks: Task[], currentTime: Date) => [...tasks].sort((a, b) =>
		a.getSteps().length - b.getSteps().length
	),
	[SortBy.TimeAvailable]: (tasks: Task[], currentTime: Date) => [...tasks].sort((a, b) =>
		a.getTimeToComplete(currentTime) - b.getTimeToComplete(currentTime)
	),
	[SortBy.Duration]: (tasks: Task[], currentTime: Date) => [...tasks].sort((a, b) =>
		a.getMaxRequiredTime(currentTime) - b.getMaxRequiredTime(currentTime)
	),
	[SortBy.RepeatInterval]: (tasks: Task[]) => [...tasks].sort((a, b) => {
		if (a.getRepeatInterval() === null) {
			return -1;
		} else if (b.getRepeatInterval() === null) {
			return 1;
		} else {
			return a.getRepeatInterval()! - b.getRepeatInterval()!;
		}
	})
}

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
	currentSortBy: SortBy = SortBy.Priority;
	currentSortDirection: SortDirection = SortDirection.Ascending;

	constructor(
		private readonly activatedRoute: ActivatedRoute
	) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];
		this.resetSortButtonIcons();
	}

	resetSortButtonIcons() {
		const unsorted_button_images = document.querySelectorAll('.unsorted');
		const sort_button_images = document.querySelectorAll('.sorted-ascending, .sorted-descending');

		unsorted_button_images.forEach(image => {
			image.classList.remove('hidden');
		})

		sort_button_images.forEach(image => {
			image.classList.add('hidden');
		})
	}

	getTasks(): Task[] {
		const tasksInPriorityOrder = this.tasksManager.getTasksInPriorityOrder(new Date());

		const sortFunction = sortByToFunction[this.currentSortBy];
		const sortedTasks = sortFunction(tasksInPriorityOrder, new Date());

		if (this.currentSortDirection === SortDirection.Descending) {
			sortedTasks.reverse();
		}

		const filterFunction = filterToFunction[this.currentFilter];
		return filterFunction(sortedTasks);
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

	toggleColumnSort(onClickEvent: MouseEvent, column_num: number) {
		const oldSortBy = this.currentSortBy;
		this.currentSortBy = column_num as SortBy;

		if (oldSortBy !== this.currentSortBy) {
			this.currentSortDirection = SortDirection.Ascending;
		}
		else {
			this.currentSortDirection =
				this.currentSortDirection === SortDirection.Ascending
					? SortDirection.Descending
					: SortDirection.Ascending
		}

		// Find images inside clicked button
		const imgElement = onClickEvent.target as HTMLImageElement
		const buttonElement = imgElement.parentElement as HTMLButtonElement

		this.resetSortButtonIcons()
		const unsorted_image = buttonElement.querySelector(".unsorted");
		const sorted_asc_image = buttonElement.querySelector(".sorted-ascending");
		const sorted_desc_image = buttonElement.querySelector(".sorted-descending");

		console.log({
			buttonElement,
			unsorted_image,
			sorted_asc_image,
			sorted_desc_image,
		})

		unsorted_image?.classList.add('hidden');
		if (this.currentSortDirection === SortDirection.Ascending) {
			sorted_asc_image?.classList.remove('hidden');
		}
		else {
			sorted_desc_image?.classList.remove('hidden');
		}
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
