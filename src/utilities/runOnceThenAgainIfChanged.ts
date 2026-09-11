export class RunOnceThenAgainIfChanged {
	private currentTaskRunning: Promise<void> | null = null;
	private wasRerunRequested = false;
	private taskToRerun: Promise<void> | null = null;

	run(task: () => Promise<void>): Promise<void> {
		if (!this.currentTaskRunning) {
			this.currentTaskRunning = this.runOnceThenRunRerunRequest(task);
			return this.currentTaskRunning;
		}

		if (!this.taskToRerun) {
			this.wasRerunRequested = true;
			this.taskToRerun = this.currentTaskRunning.then(() => this.awaitCurrentTaskRunning());
		}
		return this.taskToRerun;
	}

	private async awaitCurrentTaskRunning(): Promise<void> {
		if (this.currentTaskRunning) await this.currentTaskRunning;
	}

	private async runOnceThenRunRerunRequest(task: () => Promise<void>): Promise<void> {
		try {
			await task();
		} 
		finally {
			this.currentTaskRunning = null;
		}

		if (this.wasRerunRequested) {
			this.wasRerunRequested = false;
			this.taskToRerun = null;
			this.currentTaskRunning = this.runOnceThenRunRerunRequest(task);
			await this.currentTaskRunning;
		}
	}
}
