export const REVERB_SECONDS = 2.4;
const REVERB_DECAY_SHARPNESS = 3.5;
const STEREO_CHANNEL_COUNT = 2;
const audioContextToReverbImpulseResponse = new WeakMap<BaseAudioContext, AudioBuffer>();

export function getReverbImpulseResponseOfAudioContext(audioContext: BaseAudioContext): AudioBuffer {
	const cachedImpulseResponse = audioContextToReverbImpulseResponse.get(audioContext);
	if (cachedImpulseResponse) return cachedImpulseResponse;

	const sampleCount = Math.ceil(audioContext.sampleRate * REVERB_SECONDS);
	const impulseResponse = audioContext.createBuffer(STEREO_CHANNEL_COUNT, sampleCount, audioContext.sampleRate);
	for (let channelIndex = 0; channelIndex < STEREO_CHANNEL_COUNT; channelIndex++) {
		const samples = impulseResponse.getChannelData(channelIndex);
		for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
			const remainingFraction = 1 - sampleIndex / sampleCount;
			samples[sampleIndex] = (Math.random() * 2 - 1) * remainingFraction ** REVERB_DECAY_SHARPNESS;
		}
	}

	audioContextToReverbImpulseResponse.set(audioContext, impulseResponse);
	return impulseResponse;
}
