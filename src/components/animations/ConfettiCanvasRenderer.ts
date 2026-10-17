import styles from './ConfettiBurst.module.css';
import { confettiPerformanceManager, type ConfettiBurstHandle } from './ConfettiPerformanceManager';
import {
	calculateExtrapolatedMotionDistance,
	calculateOpacityOfConfettiPiece,
	drawConfettiPiece,
	moveConfettiPiece,
	type ConfettiPiece,
} from './ConfettiPiece';
import {
	calculateCanvasPixelRatio,
	calculateConfettiQualityLevelEffects,
	calculatePieceVisibility,
	easeToward,
} from './confettiQualityLevelEffects';

const LONGEST_SIMULATED_FRAME_SECONDS = 1 / 20;
const LARGEST_CANVAS_PIXEL_RATIO = 2;
const CLEARED_AREA_PADDING_PIXELS = 2;
const PIECE_BUDGET_EASE_SECONDS = 0.3;
const MINIMUM_SECONDS_BETWEEN_CANVAS_RESOLUTION_CHANGES = 1;
const MINIMUM_DRAWN_OPACITY = 0.01;
const TARGET_FRAME_WORK_SECONDS = 0.01;
const SMALLEST_DRAWN_PIECE_COUNT_CAP = 20;
const SMALLEST_DRAWN_PIECE_COUNT_TO_MEASURE_COST = 10;
const DRAWN_PIECE_COUNT_CAP_EASE_DOWN_SECONDS = 0.1;
const DRAWN_PIECE_COUNT_CAP_EASE_UP_SECONDS = 1;
const COST_ESTIMATE_RISE_WEIGHT = 0.6;
const COST_ESTIMATE_FALL_WEIGHT = 0.05;

interface ActiveConfettiBurst {
	pieces: ConfettiPiece[];
	handle: ConfettiBurstHandle;
	easedPieceBudgetFraction: number;
	elapsedSeconds: number;
	onFinish: () => void;
}

interface ClearedArea {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

const activeBursts: ActiveConfettiBurst[] = [];
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let animationFrameID = 0;
let previousFrameTime = 0;
let viewportWidth = 0;
let viewportHeight = 0;
let pixelRatio = 1;
let canvasResolutionFraction = 1;
let secondsSinceCanvasResolutionChange = Infinity;
let secondsSincePhysicsStep = 0;
let secondsOfWorkPerDrawnPiece: number | null = null;
let drawnPieceCountCapFraction = 1;
let clearedArea: ClearedArea | null = null;

function calculateCanvasPixelRatioForResolutionFraction(): number {
	return calculateCanvasPixelRatio({
		canvasResolutionFraction,
		highestPixelRatio: Math.min(window.devicePixelRatio || 1, LARGEST_CANVAS_PIXEL_RATIO),
	});
}

function resizeCanvasToViewport() {
	if (!canvas || !context) return;
	viewportWidth = window.innerWidth;
	viewportHeight = window.innerHeight;
	pixelRatio = calculateCanvasPixelRatioForResolutionFraction();
	secondsSinceCanvasResolutionChange = 0;
	canvas.width = Math.round(viewportWidth * pixelRatio);
	canvas.height = Math.round(viewportHeight * pixelRatio);
	context.fillStyle = canvas.dataset.accentColor ?? '';
	clearedArea = null;
}

function createCanvas() {
	const newCanvas = document.createElement('canvas');
	newCanvas.className = styles.canvas;
	newCanvas.setAttribute('aria-hidden', 'true');
	document.body.appendChild(newCanvas);
	newCanvas.dataset.accentColor = getComputedStyle(newCanvas).getPropertyValue('--color-accent').trim();
	canvas = newCanvas;
	context = newCanvas.getContext('2d', { desynchronized: true });
	canvasResolutionFraction = calculateConfettiQualityLevelEffects(confettiPerformanceManager.getConfettiQualityLevel()).canvasResolutionFraction;
	secondsSincePhysicsStep = 0;
	drawnPieceCountCapFraction = 1;
	resizeCanvasToViewport();
	window.addEventListener('resize', resizeCanvasToViewport);
}

function removeCanvas() {
	window.removeEventListener('resize', resizeCanvasToViewport);
	canvas?.remove();
	canvas = null;
	context = null;
	clearedArea = null;
}

function clearPreviouslyDrawnArea(drawingContext: CanvasRenderingContext2D) {
	if (!clearedArea) return;
	drawingContext.setTransform(
		1,
		0,
		0,
		1,
		0,
		0,
	);
	drawingContext.clearRect(
		clearedArea.left,
		clearedArea.top,
		clearedArea.right - clearedArea.left,
		clearedArea.bottom - clearedArea.top,
	);
	clearedArea = null;
}

function drawFrame(frameTime: number) {
	if (!context) return;
	const frameSeconds = Math.min((frameTime - previousFrameTime) / 1000, LONGEST_SIMULATED_FRAME_SECONDS);
	previousFrameTime = frameTime;

	confettiPerformanceManager.reportFrame(frameTime);
	const qualityLevelEffects = calculateConfettiQualityLevelEffects(confettiPerformanceManager.getConfettiQualityLevel());

	secondsSinceCanvasResolutionChange += frameSeconds;
	canvasResolutionFraction = qualityLevelEffects.canvasResolutionFraction;
	const shouldChangeCanvasResolution =
		secondsSinceCanvasResolutionChange >= MINIMUM_SECONDS_BETWEEN_CANVAS_RESOLUTION_CHANGES &&
		calculateCanvasPixelRatioForResolutionFraction() !== pixelRatio;
	if (shouldChangeCanvasResolution) {
		resizeCanvasToViewport();
	}

	secondsSincePhysicsStep += frameSeconds;
	const shouldStepPhysics = secondsSincePhysicsStep >= qualityLevelEffects.minimumPhysicsStepSeconds;
	const secondsToSimulate = secondsSincePhysicsStep;
	if (shouldStepPhysics) {
		secondsSincePhysicsStep = 0;
	}

	clearPreviouslyDrawnArea(context);

	const frameWorkStartTime = performance.now();
	let expectedDrawnPieceCount = 0;
	for (const burst of activeBursts) {
		burst.elapsedSeconds += frameSeconds;
		burst.easedPieceBudgetFraction = easeToward({
			currentValue: burst.easedPieceBudgetFraction,
			targetValue: burst.handle.getTargetPieceBudgetFraction(),
			frameSeconds,
			timeConstantSeconds: PIECE_BUDGET_EASE_SECONDS,
		});
		expectedDrawnPieceCount += burst.pieces.length * burst.easedPieceBudgetFraction * qualityLevelEffects.pieceCountFraction;
	}

	const largestAffordableDrawnPieceCount = secondsOfWorkPerDrawnPiece === null
		? Infinity
		: Math.max(SMALLEST_DRAWN_PIECE_COUNT_CAP, TARGET_FRAME_WORK_SECONDS / secondsOfWorkPerDrawnPiece);
	const targetDrawnPieceCountCapFraction = expectedDrawnPieceCount > 0
		? Math.min(1, largestAffordableDrawnPieceCount / expectedDrawnPieceCount)
		: 1;
	drawnPieceCountCapFraction = easeToward({
		currentValue: drawnPieceCountCapFraction,
		targetValue: targetDrawnPieceCountCapFraction,
		frameSeconds,
		timeConstantSeconds: targetDrawnPieceCountCapFraction < drawnPieceCountCapFraction
			? DRAWN_PIECE_COUNT_CAP_EASE_DOWN_SECONDS
			: DRAWN_PIECE_COUNT_CAP_EASE_UP_SECONDS,
	});

	let drawnPieceCount = 0;
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	const finishedBursts: ActiveConfettiBurst[] = [];
	for (const burst of activeBursts) {
		const visiblePieceFraction = burst.easedPieceBudgetFraction * qualityLevelEffects.pieceCountFraction * drawnPieceCountCapFraction;

		let isAnyPieceStillVisible = false;
		for (const piece of burst.pieces) {
			if (piece.isFinished) continue;

			if (shouldStepPhysics) {
				moveConfettiPiece({ piece, frameSeconds: secondsToSimulate });
			}
			const lifetimeOpacity = calculateOpacityOfConfettiPiece({
				piece,
				elapsedSeconds: burst.elapsedSeconds,
				lifetimeMultiplier: qualityLevelEffects.lifetimeMultiplier,
			});
			if (lifetimeOpacity === 0) {
				piece.isFinished = true;
				continue;
			}
			const isPieceBelowViewport = piece.y - piece.boundingRadius > viewportHeight;
			if (isPieceBelowViewport) continue;

			isAnyPieceStillVisible = true;
			if (piece.secondsUntilLaunch > 0) continue;

			const opacity = lifetimeOpacity * calculatePieceVisibility({
				visibilityRank: piece.visibilityRank,
				visiblePieceFraction,
			});
			if (opacity < MINIMUM_DRAWN_OPACITY) continue;

			const drawnRadius = piece.boundingRadius + calculateExtrapolatedMotionDistance({ piece, secondsSincePhysicsStep });
			const isPieceOffScreen =
				piece.x + drawnRadius < 0 ||
				piece.x - drawnRadius > viewportWidth ||
				piece.y + drawnRadius < 0;
			if (isPieceOffScreen) continue;

			drawnPieceCount++;
			drawConfettiPiece({
				context,
				piece,
				opacity,
				pixelRatio,
				secondsSincePhysicsStep,
				flipDetail: qualityLevelEffects.flipDetail,
			});
			left = Math.min(left, piece.x - drawnRadius);
			top = Math.min(top, piece.y - drawnRadius);
			right = Math.max(right, piece.x + drawnRadius);
			bottom = Math.max(bottom, piece.y + drawnRadius);
		}

		if (!isAnyPieceStillVisible) {
			finishedBursts.push(burst);
		}
	}

	if (left <= right) {
		clearedArea = {
			left: Math.max(0, Math.floor(left * pixelRatio) - CLEARED_AREA_PADDING_PIXELS),
			top: Math.max(0, Math.floor(top * pixelRatio) - CLEARED_AREA_PADDING_PIXELS),
			right: Math.ceil(right * pixelRatio) + CLEARED_AREA_PADDING_PIXELS,
			bottom: Math.ceil(bottom * pixelRatio) + CLEARED_AREA_PADDING_PIXELS,
		};
	}

	if (drawnPieceCount >= SMALLEST_DRAWN_PIECE_COUNT_TO_MEASURE_COST) {
		const measuredSecondsOfWorkPerDrawnPiece = (performance.now() - frameWorkStartTime) / 1000 / drawnPieceCount;
		const previousEstimate = secondsOfWorkPerDrawnPiece ?? measuredSecondsOfWorkPerDrawnPiece;
		const weight = measuredSecondsOfWorkPerDrawnPiece > previousEstimate ? COST_ESTIMATE_RISE_WEIGHT : COST_ESTIMATE_FALL_WEIGHT;
		secondsOfWorkPerDrawnPiece = previousEstimate + (measuredSecondsOfWorkPerDrawnPiece - previousEstimate) * weight;
	}

	for (const finishedBurst of finishedBursts) {
		removeBurst(finishedBurst);
		finishedBurst.onFinish();
	}

	if (activeBursts.length > 0) {
		animationFrameID = requestAnimationFrame(drawFrame);
	}
}

function removeBurst(burst: ActiveConfettiBurst) {
	const index = activeBursts.indexOf(burst);
	if (index === -1) return;

	activeBursts.splice(index, 1);
	burst.handle.unregister();
	if (activeBursts.length === 0) {
		cancelAnimationFrame(animationFrameID);
		if (context) {
			clearPreviouslyDrawnArea(context);
		}
		removeCanvas();
	}
}

export function addConfettiBurst({ pieces, onFinish }: {
	pieces: ConfettiPiece[],
	onFinish: () => void,
}): () => void {
	const isFirstActiveBurst = activeBursts.length === 0;
	const handle = confettiPerformanceManager.registerBurst({ requestedPieceCount: pieces.length });
	if (isFirstActiveBurst) {
		createCanvas();
	}

	const burst: ActiveConfettiBurst = {
		pieces,
		handle,
		easedPieceBudgetFraction: handle.getTargetPieceBudgetFraction(),
		elapsedSeconds: 0,
		onFinish,
	};
	activeBursts.push(burst);

	if (isFirstActiveBurst) {
		previousFrameTime = performance.now();
		animationFrameID = requestAnimationFrame(drawFrame);
	}

	return () => removeBurst(burst);
}
