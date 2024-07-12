export default class Task {
	private description: string;
	private steps: string[] = [];

	private earliestStartTime: Date | null = null;
	private deadline: Date | null = null;
	private minDuration: number | null = null;
	private maxDuration: number | null = null;

	private isMandatory: boolean = false;
	private isComplete: boolean = false;
	private completedSteps: number = 0;

	constructor(description: string) {
		this.description = description;
	};

	public getDescription(): string {return this.description};
	public setDescription(description: string): void {this.description = description};

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

	public getMinDuration(): number | null {return this.minDuration};
	public setMinDuration(minDuration: number): void {this.minDuration = minDuration};

	public getMaxDuration(): number | null {return this.maxDuration};
	public setMaxDuration(maxDuration: number): void {this.maxDuration = maxDuration};

	public getMinBufferTime(currentTime: Date): number {
		if (this.getMaxDuration() !== null) {
			return this.getTimeToComplete(currentTime) - this.getMaxDuration()!;
		}
		else {
			return 0;
		}
	}

	public getMaxBufferTime(currentTime: Date): number {
		if (this.getMinDuration() !== null) {
			return this.getTimeToComplete(currentTime) - this.getMinDuration()!;
		}
		else {
			return this.getTimeToComplete(currentTime);
		}
	}

	public getIsMandatory(): boolean {return this.isMandatory}
	public setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	public getIsComplete(): boolean {return this.isComplete}
	public complete(): void {this.isComplete = true;}

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