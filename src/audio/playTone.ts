export type Overtone = { frequencyMultiplier: number, volumeMultiplier: number, decayMultiplier: number };

const SILENT_VOLUME = 0.0001;

export function playVolumeEnvelope({ volumeNode, startTime, peakVolume, attackSeconds, decaySeconds }: {
	volumeNode: GainNode,
	startTime: number,
	peakVolume: number,
	attackSeconds: number,
	decaySeconds: number,
}) {
	volumeNode.gain.setValueAtTime(SILENT_VOLUME, startTime);
	volumeNode.gain.linearRampToValueAtTime(peakVolume, startTime + attackSeconds);
	volumeNode.gain.exponentialRampToValueAtTime(SILENT_VOLUME, startTime + attackSeconds + decaySeconds);
}

export function playTone({ audioContext, destination, frequency, startTime, peakVolume, attackSeconds, decaySeconds, overtones, startingPitchMultiplier = 1 }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	frequency: number,
	startTime: number,
	peakVolume: number,
	attackSeconds: number,
	decaySeconds: number,
	overtones: Overtone[],
	startingPitchMultiplier?: number,
}) {
	if (peakVolume <= SILENT_VOLUME) return;

	for (const { frequencyMultiplier, volumeMultiplier, decayMultiplier } of overtones) {
		const oscillator = audioContext.createOscillator();
		const volumeNode = audioContext.createGain();
		const overtoneFrequency = frequency * frequencyMultiplier;
		const overtoneDecaySeconds = decaySeconds * decayMultiplier;
		oscillator.frequency.setValueAtTime(overtoneFrequency * startingPitchMultiplier, startTime);
		oscillator.frequency.exponentialRampToValueAtTime(overtoneFrequency, startTime + attackSeconds + overtoneDecaySeconds / 2);
		playVolumeEnvelope({
			volumeNode,
			startTime,
			peakVolume: peakVolume * volumeMultiplier,
			attackSeconds,
			decaySeconds: overtoneDecaySeconds,
		});
		oscillator.connect(volumeNode);
		volumeNode.connect(destination);
		oscillator.start(startTime);
		oscillator.stop(startTime + attackSeconds + overtoneDecaySeconds);
	}
}
