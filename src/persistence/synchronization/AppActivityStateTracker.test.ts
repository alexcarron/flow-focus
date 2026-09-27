import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppActivityStateTracker, NO_ACTIVITY_DURATION_BEFORE_IDLE_MS, POINTER_MOVE_ACTIVITY_THROTTLE_MS } from './AppActivityStateTracker';

let isDocumentFocused = true;

function setVisibilityState(state: DocumentVisibilityState): void {
	Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

function hideTab(): void {
	setVisibilityState('hidden');
	isDocumentFocused = false;
	window.dispatchEvent(new Event('blur'));
	document.dispatchEvent(new Event('visibilitychange'));
}

function showTabWithoutFocus(): void {
	setVisibilityState('visible');
	document.dispatchEvent(new Event('visibilitychange'));
}

function focusWindow(): void {
	isDocumentFocused = true;
	window.dispatchEvent(new Event('focus'));
}

function blurWindow(): void {
	isDocumentFocused = false;
	window.dispatchEvent(new Event('blur'));
}

function dispatchPageShow({ wasRestoredFromBackForwardCache }: { wasRestoredFromBackForwardCache: boolean }): void {
	const pageShowEvent = new Event('pageshow');
	Object.defineProperty(pageShowEvent, 'persisted', { value: wasRestoredFromBackForwardCache });
	window.dispatchEvent(pageShowEvent);
}

function makeStartedTracker() {
	const onAppActivityStateChange = vi.fn();
	const onUserReturnToApp = vi.fn();
	const tracker = new AppActivityStateTracker({ onAppActivityStateChange, onUserReturnToApp });
	tracker.start();
	return { tracker, onAppActivityStateChange, onUserReturnToApp };
}

beforeEach(() => {
	vi.useFakeTimers();
	isDocumentFocused = true;
	setVisibilityState('visible');
	vi.spyOn(document, 'hasFocus').mockImplementation(() => isDocumentFocused);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	setVisibilityState('visible');
});

describe('app activity state', () => {
	it('starts active when the page is visible and focused', () => {
		const { tracker } = makeStartedTracker();
		expect(tracker.getAppActivityState()).toBe('active');
		tracker.stop();
	});

	it('is inactive when the window loses focus while visible', () => {
		const { tracker, onAppActivityStateChange } = makeStartedTracker();

		blurWindow();

		expect(tracker.getAppActivityState()).toBe('inactive');
		expect(onAppActivityStateChange).toHaveBeenCalledWith({ fromAppActivityState: 'active', toAppActivityState: 'inactive' });
		tracker.stop();
	});

	it('is hidden when the tab is hidden', () => {
		const { tracker } = makeStartedTracker();

		hideTab();

		expect(tracker.getAppActivityState()).toBe('hidden');
		tracker.stop();
	});

	it('becomes idle after no activity for the idle threshold, and active again on the next activity', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();

		vi.advanceTimersByTime(NO_ACTIVITY_DURATION_BEFORE_IDLE_MS - 1);
		expect(tracker.getAppActivityState()).toBe('active');
		vi.advanceTimersByTime(1);
		expect(tracker.getAppActivityState()).toBe('idle');

		window.dispatchEvent(new Event('keydown'));

		expect(tracker.getAppActivityState()).toBe('active');
		expect(onUserReturnToApp).toHaveBeenCalledTimes(1);
		tracker.stop();
	});

	it('resets the idle threshold on activity', () => {
		const { tracker } = makeStartedTracker();

		vi.advanceTimersByTime(NO_ACTIVITY_DURATION_BEFORE_IDLE_MS - 1);
		window.dispatchEvent(new Event('pointerdown'));
		vi.advanceTimersByTime(NO_ACTIVITY_DURATION_BEFORE_IDLE_MS - 1);

		expect(tracker.getAppActivityState()).toBe('active');
		tracker.stop();
	});

	it('counts pointer movement as activity at most once per throttle window', () => {
		const { tracker } = makeStartedTracker();

		window.dispatchEvent(new Event('pointermove'));
		vi.advanceTimersByTime(POINTER_MOVE_ACTIVITY_THROTTLE_MS - 1);
		window.dispatchEvent(new Event('pointermove'));
		vi.advanceTimersByTime(NO_ACTIVITY_DURATION_BEFORE_IDLE_MS - POINTER_MOVE_ACTIVITY_THROTTLE_MS + 1);

		expect(tracker.getAppActivityState()).toBe('idle');
		tracker.stop();
	});
});

describe('returning to the app', () => {
	it('signals a return when the window regains focus', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();

		blurWindow();
		expect(onUserReturnToApp).not.toHaveBeenCalled();
		focusWindow();

		expect(onUserReturnToApp).toHaveBeenCalledTimes(1);
		tracker.stop();
	});

	it('signals a return when the tab becomes visible without focus', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();

		hideTab();
		showTabWithoutFocus();

		expect(tracker.getAppActivityState()).toBe('inactive');
		expect(onUserReturnToApp).toHaveBeenCalledTimes(1);
		tracker.stop();
	});

	it('signals a return when the tab becomes visible and then focused', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();

		hideTab();
		showTabWithoutFocus();
		focusWindow();

		expect(tracker.getAppActivityState()).toBe('active');
		expect(onUserReturnToApp).toHaveBeenCalledTimes(2);
		tracker.stop();
	});

	it('does not signal a return when going from active to inactive or hidden', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();

		blurWindow();
		hideTab();

		expect(onUserReturnToApp).not.toHaveBeenCalled();
		tracker.stop();
	});

	it('always signals a return when restored from the back/forward cache, even if the state is unchanged', () => {
		const { tracker, onUserReturnToApp, onAppActivityStateChange } = makeStartedTracker();

		dispatchPageShow({ wasRestoredFromBackForwardCache: true });

		expect(onAppActivityStateChange).not.toHaveBeenCalled();
		expect(onUserReturnToApp).toHaveBeenCalledTimes(1);
		tracker.stop();
	});

	it('ignores a page show that is not a back/forward cache restore', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();

		dispatchPageShow({ wasRestoredFromBackForwardCache: false });

		expect(onUserReturnToApp).not.toHaveBeenCalled();
		tracker.stop();
	});

	it('stops reacting to events after stop', () => {
		const { tracker, onUserReturnToApp } = makeStartedTracker();
		tracker.stop();

		blurWindow();
		focusWindow();

		expect(onUserReturnToApp).not.toHaveBeenCalled();
	});
});
