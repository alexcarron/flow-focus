export type AppActivityState = 'hidden' | 'inactive' | 'idle' | 'active';

export interface AppActivityStateChange {
	fromAppActivityState: AppActivityState;
	toAppActivityState: AppActivityState;
}

export interface AppActivityStateTrackerCallbacks {
	onAppActivityStateChange?: (appActivityStateChange: AppActivityStateChange) => void;
	onUserReturnToApp?: () => void;
}

export const NO_ACTIVITY_DURATION_BEFORE_IDLE_MS = 300_000;
export const POINTER_MOVE_ACTIVITY_THROTTLE_MS = 5_000;
const USER_ACTIVITY_EVENT_TYPES = ['keydown', 'pointerdown', 'touchstart', 'wheel'] as const;
const PASSIVE_CAPTURING_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

function isReturnToApp({ fromAppActivityState, toAppActivityState }: AppActivityStateChange): boolean {
	const hasBecomeActive = toAppActivityState === 'active' && fromAppActivityState !== 'active';
	const hasBecomeVisibleWithoutFocus = fromAppActivityState === 'hidden' && toAppActivityState === 'inactive';
	return hasBecomeActive || hasBecomeVisibleWithoutFocus;
}

export class AppActivityStateTracker {
	private readonly onAppActivityStateChange: (appActivityStateChange: AppActivityStateChange) => void;
	private readonly onUserReturnToApp: () => void;

	private isStarted = false;
	private appActivityState: AppActivityState = 'active';
	private hasReachedIdleThreshold = false;
	private idleThresholdTimeoutID: ReturnType<typeof setTimeout> | undefined;
	private timePointerMoveLastCountedAsActivityAt: number | undefined;

	constructor(callbacks: AppActivityStateTrackerCallbacks = {}) {
		this.onAppActivityStateChange = callbacks.onAppActivityStateChange ?? (() => {});
		this.onUserReturnToApp = callbacks.onUserReturnToApp ?? (() => {});

		this.onVisibilityChange = this.onVisibilityChange.bind(this);
		this.onWindowFocus = this.onWindowFocus.bind(this);
		this.onWindowBlur = this.onWindowBlur.bind(this);
		this.onPageRestoredFromBackForwardCache = this.onPageRestoredFromBackForwardCache.bind(this);
		this.onUserActivity = this.onUserActivity.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onIdleThresholdReached = this.onIdleThresholdReached.bind(this);
	}

	getAppActivityState(): AppActivityState {
		return this.appActivityState;
	}

	start(): void {
		if (this.isStarted) return;
		this.isStarted = true;

		document.addEventListener('visibilitychange', this.onVisibilityChange);
		window.addEventListener('focus', this.onWindowFocus);
		window.addEventListener('blur', this.onWindowBlur);
		window.addEventListener('pageshow', this.onPageRestoredFromBackForwardCache);
		for (const eventType of USER_ACTIVITY_EVENT_TYPES) {
			window.addEventListener(eventType, this.onUserActivity, PASSIVE_CAPTURING_LISTENER_OPTIONS);
		}
		window.addEventListener('pointermove', this.onPointerMove, PASSIVE_CAPTURING_LISTENER_OPTIONS);

		this.hasReachedIdleThreshold = false;
		this.restartIdleThresholdTimer();
		this.appActivityState = this.computeAppActivityState();
	}

	stop(): void {
		if (!this.isStarted) return;
		this.isStarted = false;

		document.removeEventListener('visibilitychange', this.onVisibilityChange);
		window.removeEventListener('focus', this.onWindowFocus);
		window.removeEventListener('blur', this.onWindowBlur);
		window.removeEventListener('pageshow', this.onPageRestoredFromBackForwardCache);
		for (const eventType of USER_ACTIVITY_EVENT_TYPES) {
			window.removeEventListener(eventType, this.onUserActivity, PASSIVE_CAPTURING_LISTENER_OPTIONS);
		}
		window.removeEventListener('pointermove', this.onPointerMove, PASSIVE_CAPTURING_LISTENER_OPTIONS);

		this.clearIdleThresholdTimer();
	}

	private onVisibilityChange(): void {
		this.updateAppActivityState();
	}

	private onWindowFocus(): void {
		this.onUserActivity();
	}

	private onWindowBlur(): void {
		this.updateAppActivityState();
	}

	private onPageRestoredFromBackForwardCache(event: PageTransitionEvent): void {
		if (!event.persisted) return;
		this.resetIdleThreshold();
		this.updateAppActivityState();
		this.onUserReturnToApp();
	}

	private onUserActivity(): void {
		this.resetIdleThreshold();
		this.updateAppActivityState();
	}

	private onPointerMove(): void {
		const now = Date.now();
		const isWithinThrottleWindow = this.timePointerMoveLastCountedAsActivityAt !== undefined
			&& now - this.timePointerMoveLastCountedAsActivityAt < POINTER_MOVE_ACTIVITY_THROTTLE_MS;
		if (isWithinThrottleWindow) return;

		this.timePointerMoveLastCountedAsActivityAt = now;
		this.onUserActivity();
	}

	private onIdleThresholdReached(): void {
		this.idleThresholdTimeoutID = undefined;
		this.hasReachedIdleThreshold = true;
		this.updateAppActivityState();
	}

	private resetIdleThreshold(): void {
		this.hasReachedIdleThreshold = false;
		this.restartIdleThresholdTimer();
	}

	private restartIdleThresholdTimer(): void {
		this.clearIdleThresholdTimer();
		this.idleThresholdTimeoutID = setTimeout(this.onIdleThresholdReached, NO_ACTIVITY_DURATION_BEFORE_IDLE_MS);
	}

	private clearIdleThresholdTimer(): void {
		if (this.idleThresholdTimeoutID === undefined) return;
		clearTimeout(this.idleThresholdTimeoutID);
		this.idleThresholdTimeoutID = undefined;
	}

	private computeAppActivityState(): AppActivityState {
		if (document.visibilityState === 'hidden') return 'hidden';
		if (!document.hasFocus()) return 'inactive';
		if (this.hasReachedIdleThreshold) return 'idle';
		return 'active';
	}

	private updateAppActivityState(): void {
		const appActivityStateChange: AppActivityStateChange = {
			fromAppActivityState: this.appActivityState,
			toAppActivityState: this.computeAppActivityState(),
		};
		if (appActivityStateChange.fromAppActivityState === appActivityStateChange.toAppActivityState) return;

		this.appActivityState = appActivityStateChange.toAppActivityState;
		this.onAppActivityStateChange(appActivityStateChange);
		if (isReturnToApp(appActivityStateChange)) this.onUserReturnToApp();
	}
}
