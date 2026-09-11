import { describe, it, expect, vi } from 'vitest';
import { RunOnceThenAgainIfChanged } from './runOnceThenAgainIfChanged';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(r => { resolve = r; });
	return { promise, resolve };
}

describe('RunOnceThenAgainIfChanged', () => {
	it('runs the task immediately when idle', async () => {
		const runner = new RunOnceThenAgainIfChanged();
		const task = vi.fn().mockResolvedValue(undefined);

		await runner.run(task);

		expect(task).toHaveBeenCalledTimes(1);
	});

	it('runs the task again exactly once for any number of calls that arrive while it is running', async () => {
		const runner = new RunOnceThenAgainIfChanged();
		const firstRun = deferred<void>();
		const task = vi.fn()
			.mockImplementationOnce(() => firstRun.promise)
			.mockResolvedValue(undefined);

		const callA = runner.run(task);
		const callB = runner.run(task);
		const callC = runner.run(task);

		expect(task).toHaveBeenCalledTimes(1);

		firstRun.resolve();
		await Promise.all([callA, callB, callC]);

		expect(task).toHaveBeenCalledTimes(2);
	});

	it('runs a fresh task again if another call arrives while the trailing rerun is itself in flight', async () => {
		const runner = new RunOnceThenAgainIfChanged();
		const firstRun = deferred<void>();
		const secondRun = deferred<void>();
		const task = vi.fn()
			.mockImplementationOnce(() => firstRun.promise)
			.mockImplementationOnce(() => secondRun.promise)
			.mockResolvedValue(undefined);

		const callA = runner.run(task);
		const callB = runner.run(task);

		firstRun.resolve();
		await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(2));

		const callC = runner.run(task);
		secondRun.resolve();

		await Promise.all([callA, callB, callC]);
		expect(task).toHaveBeenCalledTimes(3);
	});

	it('runs the task again on the next call once it has gone idle', async () => {
		const runner = new RunOnceThenAgainIfChanged();
		const task = vi.fn().mockResolvedValue(undefined);

		await runner.run(task);
		await runner.run(task);

		expect(task).toHaveBeenCalledTimes(2);
	});
});
