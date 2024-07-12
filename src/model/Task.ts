export default class Task {
	private description: string;
	private steps: string[] = [];
	private deadline: Date | null = null;
	private _isMandatory: boolean = false;
	private _isComplete: boolean = false;

	constructor(description: string) {
		this.description = description;
	};

	public getDescription(): string {
		return this.description;
	};
	public setDescription(description: string): void {
		this.description = description;
	};

	public getNextStep(): string | null {
		if (this.steps.length === 0) {
			return null;
		}

		return this.steps[0];
	};
	public replaceNextStep(newNextStep: string): void {
		if (this.steps.length === 0) {
			return;
		}

		this.steps[0] = newNextStep;
	};
	public addStep(step: string): void {
		this.steps.push(step);
	};

	public getDeadline(): Date | null {
		return this.deadline;
	};
	public getMillisecondsLeft(): number | null {
		if (this.getDeadline() === null) {
			return null;
		}

		const deadlineTime = this.getDeadline()!.getTime();
		const currentTime = Date.now();

		return deadlineTime - currentTime;
	}
	public setDeadline(deadline: Date): void {
		this.deadline = deadline;
	};

	public isMandatory(): boolean {
		return this._isMandatory;
	};
	public setMandatory(isMandatory: boolean): void {
		this._isMandatory = isMandatory;
	};

	public isComplete(): boolean {
		return this._isComplete;
	}
	public complete(): void {
		this._isComplete = true;
	};
}