export default class Task {
	private description: string;
	private steps: string[] = [];

	private earliestStartTime: Date | null = null;
	private deadline: Date | null = null;
	private minRequiredTime: number | null = null;
	private maxRequiredTime: number | null = null;

	private repeatInterval: number | null = null;

	private isMandatory: boolean = false;
	private isComplete: boolean = false;
	private completedSteps: number = 0;

	constructor(description: string) {
		this.description = description;
	};

	public getDescription(): string {return this.description};
	public setDescription(description: string): void {this.description = description};

	public isRecurring(): boolean {return this.repeatInterval !== null};
	public getRepeatInterval(): number | null {return this.repeatInterval};

	/**
	 * Makes the task recurring by setting the repeat interval and time the interval should start.
	 * If the deadline is not set or is after the end of the interval, it is set to the end of the interval.
	 *
	 * @param {number} repeatInterval - The interval in milliseconds at which the task should repeat.
	 * @param {Date} intervalStartTime - The time at which the task should start repeating.
	 */
	public makeRecurring(repeatInterval: number, intervalStartTime: Date): void {
		this.repeatInterval = repeatInterval;
		this.earliestStartTime = intervalStartTime;

		const intervalEndTime = new Date(this.earliestStartTime.getTime() + repeatInterval);

		// If deadline is not set or if deadline is after the end of the interval set it to the end of the interval
		if (
			this.deadline === null ||
			this.deadline.getTime() > intervalEndTime.getTime()
		) {
			this.deadline = new Date(this.earliestStartTime.getTime() + repeatInterval);
		}
	};

	public isPastIntervalEndTime(): boolean {
		if (!this.isRecurring()) {
			return false;
		}

		const intervalEndTime = new Date(this.earliestStartTime!.getTime() + this.repeatInterval!);

		return Date.now() > intervalEndTime.getTime();
	};

	/**
	 * Handles resetting a task's interval and progress when the current time passes the end of a task interval.
	 */
	public onPastIntervalEndTime(): void {
		if (!this.isRecurring()) {
			return;
		}

		// Reset task's progress
		this.completedSteps = 0;
		this.isComplete = false;

		let isNextIntervalStartTimeInFuture: boolean = false;
		while (!isNextIntervalStartTimeInFuture) {
			const nextIntervalStartTime = new Date(this.earliestStartTime!.getTime() + this.repeatInterval!);
			const nextIntervalDeadline = new Date(this.deadline!.getTime() + this.repeatInterval!);

			if (nextIntervalStartTime.getTime() > Date.now()) {
				isNextIntervalStartTimeInFuture = true;
			}
			else {
				this.earliestStartTime = nextIntervalStartTime;
				this.deadline = nextIntervalDeadline;
			}
		}

	};

	public getSteps(): string[] {return this.steps};
	public getNextUncompletedStep(): string | null {
		if (this.steps.length === 0) {
			return null;
		}

		if (this.completedSteps >= this.steps.length) {
			return null;
		}

		return this.steps[this.completedSteps];
	};
	public replaceNextUncompletedStep(newNextStep: string): void {
		if (this.getNextUncompletedStep() === null) {
			return;
		}

		this.steps[this.completedSteps] = newNextStep;
	};
	public addStep(step: string): void {
		this.steps.push(step);
	};
	public completeStep(): void {
		if (this.getNextUncompletedStep() === null) {
			return;
		}

		this.completedSteps += 1;
	}
	public editSteps(newSteps: string[]): void {
		this.steps = newSteps;
	}

	public getEarliestStartTime(): Date | null {return this.earliestStartTime};
	public setEarliestStartTime(earliestStartTime: Date): void {this.earliestStartTime = earliestStartTime};

	public getDeadline(): Date | null {return this.deadline};
	public setDeadline(deadline: Date): void {this.deadline = deadline};
	public getMillisecondsLeft(): number | null {
		if (this.getDeadline() === null) {
			return null;
		}

		const deadlineTime = this.getDeadline()!.getTime();
		const currentTime = Date.now();

		return deadlineTime - currentTime;
	}

	public getTimeToComplete(currentTime: Date): number {
		if (this.getDeadline() === null) {
			return Number.POSITIVE_INFINITY;
		}

		const earliestStartTime = this.getEarliestStartTime()?.getTime();
		const deadlineTime = this.getDeadline()!.getTime();

		if (
			earliestStartTime !== undefined &&
			currentTime.getTime() < earliestStartTime
		) {
			return deadlineTime - earliestStartTime;
		}

		return deadlineTime - currentTime.getTime();
	}

	public getMinRequiredTime(): number {
		if (this.minRequiredTime === null) {
			return 0;
		}
		return this.minRequiredTime
	};
	public setMinRequiredTime(minRequiredTime: number): void {this.minRequiredTime = minRequiredTime};

	public getMaxRequiredTime(): number {
		if (this.maxRequiredTime === null) {
			if (this.deadline === null) {
				return Number.POSITIVE_INFINITY;
			}
			else if (this.earliestStartTime === null) {
				return this.deadline.getTime() - Date.now();
			}
			else {
				return this.deadline.getTime() - this.earliestStartTime.getTime();
			}
		}
		return this.maxRequiredTime
	};
	public setMaxRequiredTime(maxRequriedTime: number): void {this.maxRequiredTime = maxRequriedTime};

	public getMinSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMaxRequiredTime();
	}

	public getMaxSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMinRequiredTime();
	}

	public getIsMandatory(): boolean {return this.isMandatory}
	public setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	public getIsComplete(): boolean {return this.isComplete}
	public complete(): void {this.isComplete = true}
	public undoComplete(): void {this.isComplete = false}

	public getProgress(): number {
		if (this.getIsComplete()) {
			return 1;
		}

		if (this.steps.length === 0) {
			return 0;
		}

		return this.completedSteps / this.steps.length;
	}
}