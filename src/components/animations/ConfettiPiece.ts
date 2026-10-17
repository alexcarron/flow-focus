const PIECE_FADE_OUT_SECONDS = 1.2;
const BASELINE_FRAMES_PER_SECOND = 60;

export interface ConfettiPiece {
	x: number;
	y: number;
	velocityX: number;
	velocityY: number;
	gravityPerFrame: number;
	windSpeedPerFrame: number;
	airResistanceDecayRatePerFrame: number;
	secondsUntilLaunch: number;
	lifetimeSeconds: number;
	width: number;
	height: number;
	boundingRadius: number;
	visibilityRank: number;
	isFinished: boolean;
	rotation: number;
	rotationSpeed: number;
	flipPhase: number;
	flipSpeed: number;
	swayPhase: number;
	swaySpeed: number;
	swayAmplitude: number;
}

export function moveConfettiPiece({ piece, frameSeconds }: {
	piece: ConfettiPiece,
	frameSeconds: number,
}) {
	if (piece.secondsUntilLaunch > 0) {
		piece.secondsUntilLaunch -= frameSeconds;
		return;
	}

	const frameScale = frameSeconds * BASELINE_FRAMES_PER_SECOND;
	const airResistance = Math.exp(-piece.airResistanceDecayRatePerFrame * frameScale);

	piece.velocityX = piece.windSpeedPerFrame + (piece.velocityX - piece.windSpeedPerFrame) * airResistance;
	piece.velocityY = piece.velocityY * airResistance + piece.gravityPerFrame * frameScale;
	piece.swayPhase += piece.swaySpeed * frameSeconds;
	piece.x += (piece.velocityX + Math.sin(piece.swayPhase) * piece.swayAmplitude) * frameScale;
	piece.y += piece.velocityY * frameScale;
	piece.rotation += piece.rotationSpeed * frameSeconds;
	piece.flipPhase += piece.flipSpeed * frameSeconds;
}

export function calculateOpacityOfConfettiPiece({ piece, elapsedSeconds, lifetimeMultiplier }: {
	piece: ConfettiPiece,
	elapsedSeconds: number,
	lifetimeMultiplier: number,
}): number {
	const opacity = (piece.lifetimeSeconds * lifetimeMultiplier - elapsedSeconds) / PIECE_FADE_OUT_SECONDS;
	return Math.min(1, Math.max(0, opacity));
}

export function calculateExtrapolatedMotionDistance({ piece, secondsSincePhysicsStep }: {
	piece: ConfettiPiece,
	secondsSincePhysicsStep: number,
}): number {
	if (secondsSincePhysicsStep === 0) return 0;
	const framesSincePhysicsStep = secondsSincePhysicsStep * BASELINE_FRAMES_PER_SECOND;
	return (Math.abs(piece.velocityX) + piece.swayAmplitude + Math.abs(piece.velocityY)) * framesSincePhysicsStep;
}

export function drawConfettiPiece({ context, piece, opacity, pixelRatio, secondsSincePhysicsStep, flipDetail }: {
	context: CanvasRenderingContext2D,
	piece: ConfettiPiece,
	opacity: number,
	pixelRatio: number,
	secondsSincePhysicsStep: number,
	flipDetail: number,
}) {
	let x = piece.x;
	let y = piece.y;
	let rotation = piece.rotation;
	let flipPhase = piece.flipPhase;
	if (secondsSincePhysicsStep > 0) {
		const framesSincePhysicsStep = secondsSincePhysicsStep * BASELINE_FRAMES_PER_SECOND;
		x += (piece.velocityX + Math.sin(piece.swayPhase) * piece.swayAmplitude) * framesSincePhysicsStep;
		y += piece.velocityY * framesSincePhysicsStep;
		rotation += piece.rotationSpeed * secondsSincePhysicsStep;
		flipPhase += piece.flipSpeed * secondsSincePhysicsStep;
	}

	const flipScale = 1 - (1 - Math.cos(flipPhase)) * flipDetail;
	const rotationCosine = Math.cos(rotation) * pixelRatio;
	const rotationSine = Math.sin(rotation) * pixelRatio;

	context.setTransform(
		rotationCosine,
		rotationSine,
		-rotationSine * flipScale,
		rotationCosine * flipScale,
		x * pixelRatio,
		y * pixelRatio,
	);
	context.globalAlpha = opacity * (0.6 + 0.4 * Math.abs(flipScale));
	context.fillRect(
		-piece.width / 2,
		-piece.height / 2,
		piece.width,
		piece.height,
	);
}
