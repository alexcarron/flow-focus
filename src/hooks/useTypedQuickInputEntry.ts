import { useMemo, useState } from 'react';
import Tag from '../model/tag/Tag';
import parseTypedQuickInput from '../model/typed-quick-input/parseTypedQuickInput';
import { EscapedTokenLocation, isTokenEscapedByLocation, PinnedPrerequisiteTaskLocation, TypedQuickInputField } from '../model/typed-quick-input/TypedQuickInputToken';
import removeEscapeCharactersBeforeTokens from '../model/typed-quick-input/removeEscapeCharactersBeforeTokens';
import updateTokenLocationsAfterTextChange from '../model/typed-quick-input/updateTokenLocationsAfterTextChange';
import Time from '../model/time-management/Time';

export default function useTypedQuickInputEntry(config: {
	nightTime: Time;
	morningTime: Time;
	existingTags: Tag[];
	prerequisiteTaskCandidates: { id: string; description: string }[];
}) {
	const [name, setNameState] = useState('');
	const [escapedTokenLocations, setEscapedTokenLocations] = useState<EscapedTokenLocation[]>([]);
	const [pinnedPrerequisiteTaskLocations, setPinnedPrerequisiteTaskLocations] = useState<PinnedPrerequisiteTaskLocation[]>([]);

	const nightTimeText = config.nightTime.toString();
	const morningTimeText = config.morningTime.toString();

	const parseResult = useMemo(
		() => parseTypedQuickInput({
			input: name,
			now: new Date(),
			nightTime: Time.fromString(nightTimeText),
			morningTime: Time.fromString(morningTimeText),
			escapedTokenLocations,
			existingTags: config.existingTags,
			prerequisiteTaskCandidates: config.prerequisiteTaskCandidates,
			pinnedPrerequisiteTaskLocations,
		}),
		[name, nightTimeText, morningTimeText, escapedTokenLocations, config.existingTags, config.prerequisiteTaskCandidates, pinnedPrerequisiteTaskLocations]
	);

	function setName(nextName: string) {
		const shiftedEscapedTokenLocations = updateTokenLocationsAfterTextChange(name, nextName, escapedTokenLocations);
		const shiftedPinnedPrerequisiteTaskLocations = updateTokenLocationsAfterTextChange(name, nextName, pinnedPrerequisiteTaskLocations);
		const { input, escapedTokenLocations: nextEscapedTokenLocations } = removeEscapeCharactersBeforeTokens({
			input: nextName,
			now: new Date(),
			nightTime: Time.fromString(nightTimeText),
			morningTime: Time.fromString(morningTimeText),
			escapedTokenLocations: shiftedEscapedTokenLocations,
			existingTags: config.existingTags,
			prerequisiteTaskCandidates: config.prerequisiteTaskCandidates,
			pinnedPrerequisiteTaskLocations: shiftedPinnedPrerequisiteTaskLocations,
		});
		setEscapedTokenLocations(nextEscapedTokenLocations);
		setPinnedPrerequisiteTaskLocations(updateTokenLocationsAfterTextChange(nextName, input, shiftedPinnedPrerequisiteTaskLocations));
		setNameState(input);
	}

	function setNameAndPinPrerequisiteTask({ nextName, pinnedLocation }: { nextName: string; pinnedLocation: PinnedPrerequisiteTaskLocation }) {
		setName(nextName);
		setPinnedPrerequisiteTaskLocations(previous => [...previous, pinnedLocation]);
	}

	function toggleTokenEscape(field: TypedQuickInputField, matchedText: string, startIndex: number, endIndex: number) {
		const token: EscapedTokenLocation = { field, matchedText, startIndex, endIndex };
		const doesLocationEscapeToken = (location: EscapedTokenLocation) => isTokenEscapedByLocation({ token, location });
		setEscapedTokenLocations(previous => {
			const isAlreadyEscaped = previous.some(doesLocationEscapeToken);
			if (isAlreadyEscaped) return previous.filter(location => !doesLocationEscapeToken(location));
			return [...previous, token];
		});
	}

	function reset() {
		setNameState('');
		setEscapedTokenLocations([]);
		setPinnedPrerequisiteTaskLocations([]);
	}

	return {
		name,
		setName,
		setNameAndPinPrerequisiteTask,
		pinnedPrerequisiteTaskLocations,
		toggleTokenEscape,
		reset,
		...parseResult,
	};
}
