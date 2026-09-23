import { useMemo, useState } from 'react';
import Tag from '../model/tag/Tag';
import parseTypedQuickInput from '../model/typed-quick-input/parseTypedQuickInput';
import { EscapedTokenLocation, serializeEscapedTokenLocation, TypedQuickInputField } from '../model/typed-quick-input/TypedQuickInputToken';
import updateEscapedTokenLocationsAfterTextChange from '../model/typed-quick-input/updateEscapedTokenLocationsAfterTextChange';
import Time from '../model/time-management/Time';

export default function useTypedQuickInputEntry(config: { nightTime: Time; morningTime: Time; existingTags: Tag[] }) {
	const [name, setNameState] = useState('');
	const [escapedTokenLocations, setEscapedTokenLocations] = useState<EscapedTokenLocation[]>([]);

	const parseResult = useMemo(
		() => parseTypedQuickInput({
			input: name,
			now: new Date(),
			nightTime: config.nightTime,
			morningTime: config.morningTime,
			escapedTokenLocations,
			existingTags: config.existingTags,
		}),
		[name, config.nightTime, config.morningTime, escapedTokenLocations, config.existingTags]
	);

	function setName(nextName: string) {
		setEscapedTokenLocations(previous => updateEscapedTokenLocationsAfterTextChange(name, nextName, previous));
		setNameState(nextName);
	}

	function toggleTokenEscape(field: TypedQuickInputField, matchedText: string, startIndex: number, endIndex: number) {
		const location: EscapedTokenLocation = { field, matchedText, startIndex, endIndex };
		const key = serializeEscapedTokenLocation(location);
		setEscapedTokenLocations(previous => {
			const isAlreadyEscaped = previous.some(existing => serializeEscapedTokenLocation(existing) === key);
			if (isAlreadyEscaped) return previous.filter(existing => serializeEscapedTokenLocation(existing) !== key);
			return [...previous, location];
		});
	}

	function reset() {
		setNameState('');
		setEscapedTokenLocations([]);
	}

	return { name, setName, toggleTokenEscape, reset, ...parseResult };
}
