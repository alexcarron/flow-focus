import { useEffect, useEffectEvent } from 'react';
import { addConfettiBurst } from './ConfettiCanvasRenderer';
import type { ConfettiPiece } from './ConfettiPiece';

const CONFETTI_PIECES_PER_SQUARE_PIXEL = 1 / 9000;
const MINIMUM_CONFETTI_PIECE_COUNT = 35;
const MAXIMUM_CONFETTI_PIECE_COUNT = 250;

const SMALL_VIEWPORT_SHORTER_SIDE = 400;
const LARGE_VIEWPORT_SHORTER_SIDE = 900;
const SMALL_VIEWPORT_PIECE_COUNT_MULTIPLIER = 1.5;
const LARGE_VIEWPORT_PIECE_COUNT_MULTIPLIER = 1;
const SMALL_VIEWPORT_HORIZONTAL_REACH_MULTIPLIER = 2;
const LARGE_VIEWPORT_HORIZONTAL_REACH_MULTIPLIER = 1;
const SMALL_VIEWPORT_VERTICAL_REACH_MULTIPLIER = 1.1;
const LARGE_VIEWPORT_VERTICAL_REACH_MULTIPLIER = 0.85;
const VIEWPORT_EDGE_MARGIN_FRACTION = 0.05;

const LAUNCH_POSITION_OFFSET_FRACTION_OF_SHORTER_SIDE_RANGE = { minimum: -0.03, maximum: 0.03 };
const LAUNCH_DELAY_SECONDS_RANGE = { minimum: 0, maximum: 0.12 };
const CURSOR_LAUNCH_CIRCLE_RADIUS_FRACTION_OF_SHORTER_SIDE = 0.015;

const REACH_FRACTION_RANGE = { minimum: 0.3, maximum: 1 };
const PER_AXIS_REACH_FRACTION_RANGE = { minimum: 0.85, maximum: 1 };

const DOWNWARD_REACH_MULTIPLIER = 0.5;
const OFF_SCREEN_HORIZONTAL_REACH_FRACTION_OF_OPPOSITE_ROOM = 0.5;
const OFF_SCREEN_VERTICAL_REACH_FRACTION_OF_OPPOSITE_ROOM = 0.5;
const UPWARD_LAUNCH_BIAS = 0.6;
const LARGEST_BURST_ROOM_FRACTION_OF_SHORTER_SIDE = 0.9;

const PIECE_LIFETIME_SECONDS_RANGE = { minimum: 3.8, maximum: 5 };

const REFERENCE_VIEWPORT_SHORTER_SIDE = 900;
const SMALLEST_PIECE_SIZE_SCALE = 0.8;
const LARGEST_PIECE_SIZE_SCALE = 1.8;
const PIECE_WIDTH_RANGE = { minimum: 6, maximum: 8 };
const PIECE_RANDOM_SIZE_MULTIPLIER_RANGE = { minimum: 0.6, maximum: 1.5 };
const PIECE_HEIGHT_TO_WIDTH_RATIO_RANGE = { minimum: 0.25, maximum: 0.8 };

const PIECE_LIGHTNESS_RANGE = { minimum: 0.6, maximum: 1.6 };
const PIECE_LIGHTNESS_LIMITS = { minimum: 0.5, maximum: 1.8 };
const PIECE_SIZE_MULTIPLIER_EXPONENT_ON_LIGHTNESS = 0.5;

const FULL_TURN_RADIANS_RANGE = { minimum: 0, maximum: Math.PI * 2 };
const ROTATION_SPEED_RANGE = { minimum: -6, maximum: 6 };
const FLIP_SPEED_RANGE = { minimum: 1, maximum: 2 };
const SWAY_SPEED_RANGE = { minimum: 0, maximum: 1 };
const SWAY_AMPLITUDE_RANGE = { minimum: 0, maximum: 0.7 };
const SWAY_SCALE_LIMITS_BY_RELATIVE_AIR_DRAG = { minimum: 0.2, maximum: 1.3 };
const FLIP_AND_ROTATION_SCALE_LIMITS_BY_RELATIVE_AIR_DRAG = { minimum: 0.6, maximum: 1.5 };

const BASE_AIR_RESISTANCE_PER_FRAME = 0.94;
const BASE_AIR_RESISTANCE_DECAY_RATE_PER_FRAME = -Math.log(BASE_AIR_RESISTANCE_PER_FRAME);
const LARGEST_AIR_RESISTANCE_DECAY_RATE_PER_FRAME = 0.3;
const GRAVITY_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT = 0.25;
const LARGEST_TERMINAL_FALL_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT = 10;
const REFERENCE_VIEWPORT_HEIGHT = 900;
const GRAVITY_MULTIPLIER_RANGE = { minimum: 0.90, maximum: 1.15 };

const BURST_GRAVITY_MULTIPLIER_LIMITS = { minimum: -1.2, maximum: 3 };
const TYPICAL_BURST_GRAVITY_MULTIPLIER = 1;
const NORMAL_BURST_GRAVITY_MULTIPLIER_STANDARD_DEVIATION = 0.12;
const WACKY_BURST_GRAVITY_MULTIPLIER_STANDARD_DEVIATION = 1.2;
const WACKY_BURST_GRAVITY_PROBABILITY = 0.12;

const BURST_AIR_DENSITY_MULTIPLIER_LIMITS = { minimum: 0.4, maximum: 3 };
const TYPICAL_BURST_AIR_DENSITY_MULTIPLIER = 1;
const NORMAL_BURST_AIR_DENSITY_MULTIPLIER_STANDARD_DEVIATION = 0.08;
const WACKY_BURST_AIR_DENSITY_MULTIPLIER_STANDARD_DEVIATION = 0.8;
const WACKY_BURST_AIR_DENSITY_PROBABILITY = 0.1;

const BURST_WIND_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT_LIMITS = { minimum: -6, maximum: 6 };
const TYPICAL_BURST_WIND_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT = 0;
const NORMAL_BURST_WIND_SPEED_STANDARD_DEVIATION = 0.25;
const WACKY_BURST_WIND_SPEED_STANDARD_DEVIATION = 2.5;
const WACKY_BURST_WIND_PROBABILITY = 0.12;

const LAUNCH_SPEED_SEARCH_ITERATIONS = 20;

function getRandomNumberInRange({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum + Math.random() * (maximum - minimum);
}

function getRandomNumberInRangeOnLogarithmicScale({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum * (maximum / minimum) ** Math.random();
}

function getRandomNumberOnBellCurve({ typicalValue, standardDeviation, minimum, maximum }: {
	typicalValue: number,
	standardDeviation: number,
	minimum: number,
	maximum: number,
}): number {
	const nonZeroRandomFraction = 1 - Math.random();
	const standardNormalNumber = Math.sqrt(-2 * Math.log(nonZeroRandomFraction)) * Math.cos(2 * Math.PI * Math.random());
	return clampNumber({
		value: typicalValue + standardNormalNumber * standardDeviation,
		minimum,
		maximum,
	});
}

function getRandomNumberInRangeFavoringMiddle({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum + (Math.random() + Math.random()) / 2 * (maximum - minimum);
}

function clampNumber({ value, minimum, maximum }: {
	value: number,
	minimum: number,
	maximum: number,
}): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function interpolateFromSmallToLargeViewport({ viewportShorterSide, smallViewportValue, largeViewportValue }: {
	viewportShorterSide: number,
	smallViewportValue: number,
	largeViewportValue: number,
}): number {
	const viewportLargeness = clampNumber({
		value: (viewportShorterSide - SMALL_VIEWPORT_SHORTER_SIDE) / (LARGE_VIEWPORT_SHORTER_SIDE - SMALL_VIEWPORT_SHORTER_SIDE),
		minimum: 0,
		maximum: 1,
	});
	return smallViewportValue + (largeViewportValue - smallViewportValue) * viewportLargeness;
}

function calculateConfettiPieceCount({ viewportWidth, viewportHeight }: {
	viewportWidth: number,
	viewportHeight: number,
}): number {
	const densityBasedPieceCount = clampNumber({
		value: viewportWidth * viewportHeight * CONFETTI_PIECES_PER_SQUARE_PIXEL,
		minimum: MINIMUM_CONFETTI_PIECE_COUNT,
		maximum: MAXIMUM_CONFETTI_PIECE_COUNT,
	});
	const pieceCountMultiplier = interpolateFromSmallToLargeViewport({
		viewportShorterSide: Math.min(viewportWidth, viewportHeight),
		smallViewportValue: SMALL_VIEWPORT_PIECE_COUNT_MULTIPLIER,
		largeViewportValue: LARGE_VIEWPORT_PIECE_COUNT_MULTIPLIER,
	});
	return Math.round(Math.min(densityBasedPieceCount * pieceCountMultiplier, MAXIMUM_CONFETTI_PIECE_COUNT));
}

function calculateRiseHeightOfLaunchSpeed({ launchSpeed, gravityPerFrame, airResistanceDecayRatePerFrame }: {
	launchSpeed: number,
	gravityPerFrame: number,
	airResistanceDecayRatePerFrame: number,
}): number {
	const terminalFallSpeed = gravityPerFrame / airResistanceDecayRatePerFrame;
	const distanceWithoutGravity = launchSpeed / airResistanceDecayRatePerFrame;
	const distanceLostToGravity = terminalFallSpeed / airResistanceDecayRatePerFrame * Math.log(1 + launchSpeed / terminalFallSpeed);
	return distanceWithoutGravity - distanceLostToGravity;
}

function calculateLaunchSpeedToRiseHeight({ riseHeight, gravityPerFrame, airResistanceDecayRatePerFrame }: {
	riseHeight: number,
	gravityPerFrame: number,
	airResistanceDecayRatePerFrame: number,
}): number {
	const calculateRiseHeight = (launchSpeed: number) => calculateRiseHeightOfLaunchSpeed({
		launchSpeed,
		gravityPerFrame,
		airResistanceDecayRatePerFrame,
	});

	let slowestLaunchSpeed = 0;
	let fastestLaunchSpeed = 1;
	while (calculateRiseHeight(fastestLaunchSpeed) < riseHeight) {
		fastestLaunchSpeed *= 2;
	}

	for (let iteration = 0; iteration < LAUNCH_SPEED_SEARCH_ITERATIONS; iteration++) {
		const middleLaunchSpeed = (slowestLaunchSpeed + fastestLaunchSpeed) / 2;
		if (calculateRiseHeight(middleLaunchSpeed) < riseHeight) {
			slowestLaunchSpeed = middleLaunchSpeed;
		}
		else {
			fastestLaunchSpeed = middleLaunchSpeed;
		}
	}
	return fastestLaunchSpeed;
}

function getRandomLaunchAngleFromStraightUp(): number {
	while (true) {
		const angleFromStraightUp = getRandomNumberInRange({ minimum: -Math.PI, maximum: Math.PI });
		const acceptanceProbability = (1 + UPWARD_LAUNCH_BIAS * Math.cos(angleFromStraightUp)) / (1 + UPWARD_LAUNCH_BIAS);
		if (Math.random() < acceptanceProbability) return angleFromStraightUp;
	}
}

function getRandomOffsetInsideCircle(radius: number): { x: number, y: number } {
	const distanceFromCenter = radius * Math.sqrt(Math.random());
	const angle = getRandomNumberInRange(FULL_TURN_RADIANS_RANGE);
	return {
		x: distanceFromCenter * Math.cos(angle),
		y: distanceFromCenter * Math.sin(angle),
	};
}

function createConfettiPiece({
	originX,
	originY,
	isOriginCursorPosition,
	viewportWidth,
	viewportHeight,
	burstGravityMultiplier,
	burstAirDensityMultiplier,
	burstWindSpeed,
}: {
	originX: number,
	originY: number,
	isOriginCursorPosition: boolean,
	viewportWidth: number,
	viewportHeight: number,
	burstGravityMultiplier: number,
	burstAirDensityMultiplier: number,
	burstWindSpeed: number,
}): ConfettiPiece {
	const viewportShorterSide = Math.min(viewportWidth, viewportHeight);
	const viewportEdgeMargin = viewportShorterSide * VIEWPORT_EDGE_MARGIN_FRACTION;
	const pieceSizeScale = clampNumber({
		value: viewportShorterSide / REFERENCE_VIEWPORT_SHORTER_SIDE,
		minimum: SMALLEST_PIECE_SIZE_SCALE,
		maximum: LARGEST_PIECE_SIZE_SCALE,
	});
	const typicalGravityPerFrame = GRAVITY_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT * (viewportHeight / REFERENCE_VIEWPORT_HEIGHT) * getRandomNumberInRange(GRAVITY_MULTIPLIER_RANGE);
	const gravityPerFrame = typicalGravityPerFrame * burstGravityMultiplier;
	const gravityStrength = Math.abs(burstGravityMultiplier);
	const weakGravityMotionScale = Math.min(gravityStrength, 1);
	const strongGravitySwayDampening = 1 / Math.max(gravityStrength, 1);
	const viewportHeightScale = viewportHeight / REFERENCE_VIEWPORT_HEIGHT;
	const randomSizeMultiplier = getRandomNumberInRangeOnLogarithmicScale(PIECE_RANDOM_SIZE_MULTIPLIER_RANGE);
	const lightness = clampNumber({
		value: getRandomNumberInRangeOnLogarithmicScale(PIECE_LIGHTNESS_RANGE) / randomSizeMultiplier ** PIECE_SIZE_MULTIPLIER_EXPONENT_ON_LIGHTNESS,
		minimum: PIECE_LIGHTNESS_LIMITS.minimum,
		maximum: PIECE_LIGHTNESS_LIMITS.maximum,
	});
	const smallestDecayRateThatKeepsFallFromBeingTooFast = Math.abs(gravityPerFrame) / (LARGEST_TERMINAL_FALL_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT * viewportHeightScale);
	const airResistanceDecayRatePerFrame = clampNumber({
		value: BASE_AIR_RESISTANCE_DECAY_RATE_PER_FRAME * burstAirDensityMultiplier * lightness,
		minimum: smallestDecayRateThatKeepsFallFromBeingTooFast,
		maximum: LARGEST_AIR_RESISTANCE_DECAY_RATE_PER_FRAME,
	});
	const relativeAirDrag = airResistanceDecayRatePerFrame / BASE_AIR_RESISTANCE_DECAY_RATE_PER_FRAME;
	const swayScaleFromAirDrag = clampNumber({
		value: relativeAirDrag,
		minimum: SWAY_SCALE_LIMITS_BY_RELATIVE_AIR_DRAG.minimum,
		maximum: SWAY_SCALE_LIMITS_BY_RELATIVE_AIR_DRAG.maximum,
	});
	const flipAndRotationScaleFromAirDrag = clampNumber({
		value: 1 / Math.sqrt(relativeAirDrag),
		minimum: FLIP_AND_ROTATION_SCALE_LIMITS_BY_RELATIVE_AIR_DRAG.minimum,
		maximum: FLIP_AND_ROTATION_SCALE_LIMITS_BY_RELATIVE_AIR_DRAG.maximum,
	});
	const cursorLaunchOffset = getRandomOffsetInsideCircle(viewportShorterSide * CURSOR_LAUNCH_CIRCLE_RADIUS_FRACTION_OF_SHORTER_SIDE);
	let launchX = originX + viewportShorterSide * getRandomNumberInRange(LAUNCH_POSITION_OFFSET_FRACTION_OF_SHORTER_SIDE_RANGE);
	let launchY = originY;
	let secondsUntilLaunch = getRandomNumberInRange(LAUNCH_DELAY_SECONDS_RANGE);
	if (isOriginCursorPosition) {
		launchX = originX + cursorLaunchOffset.x;
		launchY = originY + cursorLaunchOffset.y;
		secondsUntilLaunch = 0;
	}

	const angleFromStraightUp = getRandomLaunchAngleFromStraightUp();
	const horizontalDirection = Math.sin(angleFromStraightUp);
	const upwardDirection = Math.cos(angleFromStraightUp);
	const isLaunchedRightward = horizontalDirection > 0;
	const isLaunchedUpward = upwardDirection > 0;
	const horizontalReachMultiplier = interpolateFromSmallToLargeViewport({
		viewportShorterSide,
		smallViewportValue: SMALL_VIEWPORT_HORIZONTAL_REACH_MULTIPLIER,
		largeViewportValue: LARGE_VIEWPORT_HORIZONTAL_REACH_MULTIPLIER,
	});
	const verticalReachMultiplier = interpolateFromSmallToLargeViewport({
		viewportShorterSide,
		smallViewportValue: SMALL_VIEWPORT_VERTICAL_REACH_MULTIPLIER,
		largeViewportValue: LARGE_VIEWPORT_VERTICAL_REACH_MULTIPLIER,
	});
	const reachFraction = getRandomNumberInRangeFavoringMiddle(REACH_FRACTION_RANGE);
	const largestRoomForRoundBurst = viewportShorterSide * LARGEST_BURST_ROOM_FRACTION_OF_SHORTER_SIDE;
	const roomToLeftOfLaunch = Math.min(largestRoomForRoundBurst, Math.max(0, launchX - viewportEdgeMargin));
	const roomToRightOfLaunch = Math.min(largestRoomForRoundBurst, Math.max(0, viewportWidth - launchX - viewportEdgeMargin));
	const roomInLaunchedHorizontalDirection = isLaunchedRightward ? roomToRightOfLaunch : roomToLeftOfLaunch;
	const roomInOppositeHorizontalDirection = isLaunchedRightward ? roomToLeftOfLaunch : roomToRightOfLaunch;
	const horizontalRoom = Math.max(roomInLaunchedHorizontalDirection, roomInOppositeHorizontalDirection * OFF_SCREEN_HORIZONTAL_REACH_FRACTION_OF_OPPOSITE_ROOM);
	const roomAboveOrigin = Math.min(largestRoomForRoundBurst, Math.max(0, originY - viewportEdgeMargin));
	const roomBelowOrigin = Math.min(largestRoomForRoundBurst, Math.max(0, viewportHeight - originY - viewportEdgeMargin));
	const roomInLaunchedVerticalDirection = isLaunchedUpward ? roomAboveOrigin : roomBelowOrigin;
	const roomInOppositeVerticalDirection = isLaunchedUpward ? roomBelowOrigin : roomAboveOrigin;
	const verticalRoom = Math.max(roomInLaunchedVerticalDirection, roomInOppositeVerticalDirection * OFF_SCREEN_VERTICAL_REACH_FRACTION_OF_OPPOSITE_ROOM);
	const downwardReachMultiplier = isLaunchedUpward ? 1 : DOWNWARD_REACH_MULTIPLIER;
	const horizontalDistance = horizontalRoom * reachFraction * horizontalReachMultiplier * Math.abs(horizontalDirection) * getRandomNumberInRange(PER_AXIS_REACH_FRACTION_RANGE);
	const verticalDistance = verticalRoom * reachFraction * verticalReachMultiplier * downwardReachMultiplier * Math.abs(upwardDirection) * getRandomNumberInRange(PER_AXIS_REACH_FRACTION_RANGE);
	const launchSpeedUpward = calculateLaunchSpeedToRiseHeight({
		riseHeight: verticalDistance,
		gravityPerFrame: typicalGravityPerFrame,
		airResistanceDecayRatePerFrame,
	});
	const launchSpeedDownward = verticalDistance * airResistanceDecayRatePerFrame;
	const width = getRandomNumberInRange(PIECE_WIDTH_RANGE) * pieceSizeScale * randomSizeMultiplier;
	const height = width * getRandomNumberInRange(PIECE_HEIGHT_TO_WIDTH_RATIO_RANGE);

	return {
		x: launchX,
		y: launchY,
		velocityX: Math.sign(horizontalDirection) * horizontalDistance * airResistanceDecayRatePerFrame,
		velocityY: isLaunchedUpward ? -launchSpeedUpward : launchSpeedDownward,
		gravityPerFrame,
		windSpeedPerFrame: burstWindSpeed * viewportHeightScale,
		airResistanceDecayRatePerFrame,
		secondsUntilLaunch,
		lifetimeSeconds: getRandomNumberInRange(PIECE_LIFETIME_SECONDS_RANGE),
		width,
		height,
		boundingRadius: Math.hypot(width, height) / 2,
		visibilityRank: Math.random(),
		isFinished: false,
		rotation: getRandomNumberInRange(FULL_TURN_RADIANS_RANGE),
		rotationSpeed: getRandomNumberInRange(ROTATION_SPEED_RANGE) * flipAndRotationScaleFromAirDrag,
		flipPhase: getRandomNumberInRange(FULL_TURN_RADIANS_RANGE),
		flipSpeed: getRandomNumberInRange(FLIP_SPEED_RANGE) * weakGravityMotionScale * flipAndRotationScaleFromAirDrag,
		swayPhase: getRandomNumberInRange(FULL_TURN_RADIANS_RANGE),
		swaySpeed: getRandomNumberInRange(SWAY_SPEED_RANGE) * weakGravityMotionScale,
		swayAmplitude: getRandomNumberInRange(SWAY_AMPLITUDE_RANGE) * pieceSizeScale * weakGravityMotionScale * strongGravitySwayDampening * swayScaleFromAirDrag,
	};
}

function pickBurstWideWeather() {
	const isWackyGravity = Math.random() < WACKY_BURST_GRAVITY_PROBABILITY;
	const burstGravityMultiplier = getRandomNumberOnBellCurve({
		typicalValue: TYPICAL_BURST_GRAVITY_MULTIPLIER,
		standardDeviation: isWackyGravity
			? WACKY_BURST_GRAVITY_MULTIPLIER_STANDARD_DEVIATION
			: NORMAL_BURST_GRAVITY_MULTIPLIER_STANDARD_DEVIATION,
		minimum: BURST_GRAVITY_MULTIPLIER_LIMITS.minimum,
		maximum: BURST_GRAVITY_MULTIPLIER_LIMITS.maximum,
	});
	const isWackyAirDensity = Math.random() < WACKY_BURST_AIR_DENSITY_PROBABILITY;
	const burstAirDensityMultiplier = getRandomNumberOnBellCurve({
		typicalValue: TYPICAL_BURST_AIR_DENSITY_MULTIPLIER,
		standardDeviation: isWackyAirDensity
			? WACKY_BURST_AIR_DENSITY_MULTIPLIER_STANDARD_DEVIATION
			: NORMAL_BURST_AIR_DENSITY_MULTIPLIER_STANDARD_DEVIATION,
		minimum: BURST_AIR_DENSITY_MULTIPLIER_LIMITS.minimum,
		maximum: BURST_AIR_DENSITY_MULTIPLIER_LIMITS.maximum,
	});
	const isWackyWind = Math.random() < WACKY_BURST_WIND_PROBABILITY;
	const burstWindSpeed = getRandomNumberOnBellCurve({
		typicalValue: TYPICAL_BURST_WIND_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT,
		standardDeviation: isWackyWind
			? WACKY_BURST_WIND_SPEED_STANDARD_DEVIATION
			: NORMAL_BURST_WIND_SPEED_STANDARD_DEVIATION,
		minimum: BURST_WIND_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT_LIMITS.minimum,
		maximum: BURST_WIND_SPEED_PER_FRAME_AT_REFERENCE_VIEWPORT_HEIGHT_LIMITS.maximum,
	});
	return { burstGravityMultiplier, burstAirDensityMultiplier, burstWindSpeed };
}

export default function ConfettiBurst({ originX, originY, isOriginCursorPosition, onFinish }: {
	originX: number,
	originY: number,
	isOriginCursorPosition: boolean,
	onFinish: () => void,
}) {
	const onBurstFinished = useEffectEvent(onFinish);

	useEffect(() => {
		const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (shouldReduceMotion) {
			onBurstFinished();
			return;
		}

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const { burstGravityMultiplier, burstAirDensityMultiplier, burstWindSpeed } = pickBurstWideWeather();
		const pieces: ConfettiPiece[] = Array.from(
			{ length: calculateConfettiPieceCount({ viewportWidth, viewportHeight }) },
			() => createConfettiPiece({
				originX,
				originY,
				isOriginCursorPosition,
				viewportWidth,
				viewportHeight,
				burstGravityMultiplier,
				burstAirDensityMultiplier,
				burstWindSpeed,
			}),
		);

		return addConfettiBurst({ pieces, onFinish: onBurstFinished });
	}, [originX, originY, isOriginCursorPosition]);

	return null;
}
