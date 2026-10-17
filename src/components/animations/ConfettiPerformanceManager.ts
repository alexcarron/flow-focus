import { easeToward } from './confettiQualityLevelEffects';

const UNACCEPTABLE_FRAME_SECONDS = 1 / 24;
const LAG_PEAK_FRAME_SECONDS = 1 / 28;
const RECOVERY_PEAK_FRAME_SECONDS = 1 / 36;
const LONGEST_MEASURABLE_FRAME_SECONDS = 0.5;
const PEAK_FRAME_TIME_DECAY_SECONDS = 0.5;

const QUALITY_LEVEL_LOSS_PER_SECOND_AT_LAG_PEAK_FRAME_TIME = 1.2;
const QUALITY_LEVEL_LOSS_PER_UNACCEPTABLE_FRAME = 0.12;
const QUALITY_LEVEL_GAIN_PER_SECOND = 0.1;
const SECONDS_WITHOUT_RECOVERY_AFTER_LOSS = 2;
const QUALITY_LEVEL_EASE_DOWN_SECONDS = 0.15;
const QUALITY_LEVEL_EASE_UP_SECONDS = 1;
const SECONDS_IDLE_BEFORE_QUALITY_LEVEL_RESETS = 10;

const MAXIMUM_TOTAL_REQUESTED_PIECES = 5000;

const DEBUG_FLAG_LOCAL_STORAGE_KEY = 'debugConfettiPerformance';
const DEBUG_LOG_INTERVAL_SECONDS = 0.5;

interface ConfettiBurstRegistration {
	requestedPieceCount: number;
}

export interface ConfettiBurstHandle {
	getTargetPieceBudgetFraction: () => number;
	unregister: () => void;
}

class ConfettiPerformanceManager {
	private confettiQualityLevel = 1;
	private targetConfettiQualityLevel = 1;
	private peakFrameSeconds: number | null = null;
	private latestReportedFrameTime: number | null = null;
	private secondsUntilRecoveryAllowed = 0;
	private registrationsFromOldestToNewest: ConfettiBurstRegistration[] = [];
	private timeLastBurstUnregistered: number | null = null;
	private shouldLogDebugInformation = false;
	private secondsSinceDebugLog = 0;

	registerBurst({ requestedPieceCount }: { requestedPieceCount: number }): ConfettiBurstHandle {
		if (this.registrationsFromOldestToNewest.length === 0) {
			this.prepareForFirstBurst();
		}

		const registration = { requestedPieceCount };
		this.registrationsFromOldestToNewest.push(registration);

		return {
			getTargetPieceBudgetFraction: () => this.calculateTargetPieceBudgetFraction(registration),
			unregister: () => this.unregisterBurst(registration),
		};
	}

	getConfettiQualityLevel(): number {
		return this.confettiQualityLevel;
	}

	reportFrame(frameTime: number) {
		if (frameTime === this.latestReportedFrameTime) return;
		const previousFrameTime = this.latestReportedFrameTime;
		this.latestReportedFrameTime = frameTime;
		if (previousFrameTime === null) return;

		const frameSeconds = (frameTime - previousFrameTime) / 1000;
		if (frameSeconds <= 0 || frameSeconds > LONGEST_MEASURABLE_FRAME_SECONDS) return;

		this.updateTargetConfettiQualityLevel(frameSeconds);
		this.confettiQualityLevel = easeToward({
			currentValue: this.confettiQualityLevel,
			targetValue: this.targetConfettiQualityLevel,
			frameSeconds,
			timeConstantSeconds: this.targetConfettiQualityLevel < this.confettiQualityLevel
				? QUALITY_LEVEL_EASE_DOWN_SECONDS
				: QUALITY_LEVEL_EASE_UP_SECONDS,
		});
		this.logDebugInformation(frameSeconds);
	}

	private prepareForFirstBurst() {
		const isIdleLongEnoughToResetQualityLevel =
			this.timeLastBurstUnregistered !== null &&
			performance.now() - this.timeLastBurstUnregistered > SECONDS_IDLE_BEFORE_QUALITY_LEVEL_RESETS * 1000;
		if (isIdleLongEnoughToResetQualityLevel) {
			this.confettiQualityLevel = 1;
			this.targetConfettiQualityLevel = 1;
		}

		this.peakFrameSeconds = null;
		this.latestReportedFrameTime = null;
		this.secondsUntilRecoveryAllowed = 0;
		this.shouldLogDebugInformation = localStorage.getItem(DEBUG_FLAG_LOCAL_STORAGE_KEY) === 'true';
		this.secondsSinceDebugLog = 0;
	}

	private unregisterBurst(registration: ConfettiBurstRegistration) {
		const index = this.registrationsFromOldestToNewest.indexOf(registration);
		if (index === -1) return;

		this.registrationsFromOldestToNewest.splice(index, 1);
		if (this.registrationsFromOldestToNewest.length === 0) {
			this.timeLastBurstUnregistered = performance.now();
		}
	}

	private calculateTargetPieceBudgetFraction(registration: ConfettiBurstRegistration): number {
		let remainingPieceBudget = MAXIMUM_TOTAL_REQUESTED_PIECES;
		for (let index = this.registrationsFromOldestToNewest.length - 1; index >= 0; index--) {
			const olderOrSameRegistration = this.registrationsFromOldestToNewest[index];
			const allowedPieceCount = Math.min(olderOrSameRegistration.requestedPieceCount, remainingPieceBudget);
			remainingPieceBudget -= allowedPieceCount;
			if (olderOrSameRegistration === registration) {
				return registration.requestedPieceCount === 0 ? 1 : allowedPieceCount / registration.requestedPieceCount;
			}
		}
		return 1;
	}

	private updateTargetConfettiQualityLevel(frameSeconds: number) {
		const decayedPeakFrameSeconds = (this.peakFrameSeconds ?? 0) * Math.exp(-frameSeconds / PEAK_FRAME_TIME_DECAY_SECONDS);
		const peakFrameSeconds = Math.max(frameSeconds, decayedPeakFrameSeconds);
		this.peakFrameSeconds = peakFrameSeconds;
		this.secondsUntilRecoveryAllowed = Math.max(0, this.secondsUntilRecoveryAllowed - frameSeconds);

		let targetConfettiQualityLevel = this.targetConfettiQualityLevel;
		if (peakFrameSeconds > LAG_PEAK_FRAME_SECONDS) {
			targetConfettiQualityLevel -= QUALITY_LEVEL_LOSS_PER_SECOND_AT_LAG_PEAK_FRAME_TIME * frameSeconds * (peakFrameSeconds / LAG_PEAK_FRAME_SECONDS);
			this.secondsUntilRecoveryAllowed = SECONDS_WITHOUT_RECOVERY_AFTER_LOSS;
		}
		if (frameSeconds > UNACCEPTABLE_FRAME_SECONDS) {
			targetConfettiQualityLevel -= QUALITY_LEVEL_LOSS_PER_UNACCEPTABLE_FRAME;
			this.secondsUntilRecoveryAllowed = SECONDS_WITHOUT_RECOVERY_AFTER_LOSS;
		}
		if (peakFrameSeconds < RECOVERY_PEAK_FRAME_SECONDS && this.secondsUntilRecoveryAllowed === 0) {
			targetConfettiQualityLevel += QUALITY_LEVEL_GAIN_PER_SECOND * frameSeconds;
		}
		this.targetConfettiQualityLevel = Math.min(1, Math.max(0, targetConfettiQualityLevel));
	}

	private logDebugInformation(frameSeconds: number) {
		if (!this.shouldLogDebugInformation) return;
		this.secondsSinceDebugLog += frameSeconds;
		if (this.secondsSinceDebugLog < DEBUG_LOG_INTERVAL_SECONDS) return;

		this.secondsSinceDebugLog = 0;
		console.log('[confetti performance]', {
			confettiQualityLevel: Number(this.confettiQualityLevel.toFixed(2)),
			targetConfettiQualityLevel: Number(this.targetConfettiQualityLevel.toFixed(2)),
			peakFramesPerSecond: Math.round(1 / (this.peakFrameSeconds ?? frameSeconds)),
			liveBurstCount: this.registrationsFromOldestToNewest.length,
			requestedPieceCount: this.registrationsFromOldestToNewest.reduce((total, registration) => total + registration.requestedPieceCount, 0),
		});
	}
}

export const confettiPerformanceManager = new ConfettiPerformanceManager();
