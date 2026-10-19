const MASTER_VOLUME = 0.3;
const MASTER_HIGHPASS_FREQUENCY_HERTZ = 70;
const MASTER_LOWPASS_FREQUENCY_HERTZ = 6000;

let audioContext: AudioContext | null = null;
let masterVolumeNode: GainNode | null = null;

export function getAudioOutput(): { audioContext: AudioContext, masterVolumeNode: GainNode } | null {
	if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null;

	if (!audioContext || !masterVolumeNode) {
		audioContext = new AudioContext();
		masterVolumeNode = audioContext.createGain();
		masterVolumeNode.gain.value = MASTER_VOLUME;
		const highpassFilter = audioContext.createBiquadFilter();
		highpassFilter.type = 'highpass';
		highpassFilter.frequency.value = MASTER_HIGHPASS_FREQUENCY_HERTZ;
		const lowpassFilter = audioContext.createBiquadFilter();
		lowpassFilter.type = 'lowpass';
		lowpassFilter.frequency.value = MASTER_LOWPASS_FREQUENCY_HERTZ;
		const compressor = audioContext.createDynamicsCompressor();
		masterVolumeNode.connect(highpassFilter);
		highpassFilter.connect(lowpassFilter);
		lowpassFilter.connect(compressor);
		compressor.connect(audioContext.destination);
	}
	if (audioContext.state === 'suspended') void audioContext.resume();
	return { audioContext, masterVolumeNode };
}
