import { useMemo, useState } from 'react';
import parseTypedQuickInput from '../model/typed-quick-input/parseTypedQuickInput';
import { EscapedTokenLocation, toEscapedTokenLocation, TypedQuickInputToken } from '../model/typed-quick-input/TypedQuickInputToken';
import updateEscapedTokenLocationsAfterTextChange from '../model/typed-quick-input/updateEscapedTokenLocationsAfterTextChange';
import Time from '../model/time-management/Time';

export default function useTypedQuickInputEntry(config: { nightTime: Time; morningTime: Time }) {
	const [name, setNameState] = useState('');
	const [escapedTokenLocations, setEscapedTokenLocations] = useState<EscapedTokenLocation[]>([]);

	const parseResult = useMemo(
		() => parseTypedQuickInput({
			input: name,
			now: new Date(),
			nightTime: config.nightTime,
			morningTime: config.morningTime,
			escapedTokenLocations,
		}),
		[name, config.nightTime, config.morningTime, escapedTokenLocations]
	);

	function setName(nextName: string) {
		setEscapedTokenLocations(previous => updateEscapedTokenLocationsAfterTextChange(name, nextName, previous));
		setNameState(nextName);
	}

	function escapeToken(token: TypedQuickInputToken) {
		setEscapedTokenLocations(previous => [...previous, toEscapedTokenLocation(token)]);
	}

	function reset() {
		setNameState('');
		setEscapedTokenLocations([]);
	}

	return { name, setName, escapeToken, reset, ...parseResult };
}
