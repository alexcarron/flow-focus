const LOWEST_PIECE_COUNT_FRACTION = 0.04;
const LOWEST_LIFETIME_MULTIPLIER = 0.45;
const LOWEST_CANVAS_PIXEL_RATIO = 1;
const CANVAS_PIXEL_RATIO_STEP = 0.25;
const PIECE_REMOVAL_FADE_FRACTION = 0.15;

const FLIP_DETAIL_FULL_AT_QUALITY_LEVEL = 0.6;
const FLIP_DETAIL_NONE_AT_QUALITY_LEVEL = 0.15;
const CANVAS_RESOLUTION_FULL_AT_QUALITY_LEVEL = 0.7;
const CANVAS_RESOLUTION_LOWEST_AT_QUALITY_LEVEL = 0.1;
const PHYSICS_EVERY_FRAME_AT_QUALITY_LEVEL = 0.5;
const LONGEST_PHYSICS_STEP_SECONDS = 1 / 30;

export interface ConfettiQualityLevelEffects {
	pieceCountFraction: number;
	flipDetail: number;
	canvasResolutionFraction: number;
	lifetimeMultiplier: number;
	minimumPhysicsStepSeconds: number;
}

function clampFraction(value: number): number {
	return Math.min(1, Math.max(0, value));
}

export function calculateConfettiQualityLevelEffects(confettiQualityLevel: number): ConfettiQualityLevelEffects {
	return {
		pieceCountFraction: LOWEST_PIECE_COUNT_FRACTION + (1 - LOWEST_PIECE_COUNT_FRACTION) * confettiQualityLevel,
		flipDetail: clampFraction((confettiQualityLevel - FLIP_DETAIL_NONE_AT_QUALITY_LEVEL) / (FLIP_DETAIL_FULL_AT_QUALITY_LEVEL - FLIP_DETAIL_NONE_AT_QUALITY_LEVEL)),
		canvasResolutionFraction: clampFraction((confettiQualityLevel - CANVAS_RESOLUTION_LOWEST_AT_QUALITY_LEVEL) / (CANVAS_RESOLUTION_FULL_AT_QUALITY_LEVEL - CANVAS_RESOLUTION_LOWEST_AT_QUALITY_LEVEL)),
		lifetimeMultiplier: LOWEST_LIFETIME_MULTIPLIER + (1 - LOWEST_LIFETIME_MULTIPLIER) * confettiQualityLevel,
		minimumPhysicsStepSeconds: LONGEST_PHYSICS_STEP_SECONDS * clampFraction((PHYSICS_EVERY_FRAME_AT_QUALITY_LEVEL - confettiQualityLevel) / PHYSICS_EVERY_FRAME_AT_QUALITY_LEVEL),
	};
}

export function calculateCanvasPixelRatio({ canvasResolutionFraction, highestPixelRatio }: {
	canvasResolutionFraction: number,
	highestPixelRatio: number,
}): number {
	const unsteppedPixelRatio = LOWEST_CANVAS_PIXEL_RATIO + (highestPixelRatio - LOWEST_CANVAS_PIXEL_RATIO) * canvasResolutionFraction;
	const steppedPixelRatio = Math.round(unsteppedPixelRatio / CANVAS_PIXEL_RATIO_STEP) * CANVAS_PIXEL_RATIO_STEP;
	return Math.min(highestPixelRatio, Math.max(LOWEST_CANVAS_PIXEL_RATIO, steppedPixelRatio));
}

export function calculatePieceVisibility({ visibilityRank, visiblePieceFraction }: {
	visibilityRank: number,
	visiblePieceFraction: number,
}): number {
	if (visiblePieceFraction >= 1) return 1;
	const visibility = (visiblePieceFraction * (1 + PIECE_REMOVAL_FADE_FRACTION) - visibilityRank) / PIECE_REMOVAL_FADE_FRACTION;
	return clampFraction(visibility);
}

export function easeToward({ currentValue, targetValue, frameSeconds, timeConstantSeconds }: {
	currentValue: number,
	targetValue: number,
	frameSeconds: number,
	timeConstantSeconds: number,
}): number {
	return currentValue + (targetValue - currentValue) * (1 - Math.exp(-frameSeconds / timeConstantSeconds));
}
