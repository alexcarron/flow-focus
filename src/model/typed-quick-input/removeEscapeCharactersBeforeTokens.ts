import parseTypedQuickInput from './parseTypedQuickInput';
import { EscapedTokenLocation, toEscapedTokenLocation } from './TypedQuickInputToken';
import updateEscapedTokenLocationsAfterTextChange from './updateEscapedTokenLocationsAfterTextChange';

const ESCAPE_CHARACTER = '\\';

export default function removeEscapeCharactersBeforeTokens(
	parseConfig: Parameters<typeof parseTypedQuickInput>[0]
): { input: string; escapedTokenLocations: EscapedTokenLocation[] } {
	let input = parseConfig.input;
	let escapedTokenLocations = parseConfig.escapedTokenLocations ?? [];

	let escapeCharacterIndex = input.indexOf(ESCAPE_CHARACTER);
	while (escapeCharacterIndex !== -1) {
		const inputWithoutEscapeCharacter = input.slice(0, escapeCharacterIndex) + input.slice(escapeCharacterIndex + 1);
		const shiftedEscapedTokenLocations = updateEscapedTokenLocationsAfterTextChange(input, inputWithoutEscapeCharacter, escapedTokenLocations);
		const { tokens } = parseTypedQuickInput({
			...parseConfig,
			input: inputWithoutEscapeCharacter,
			escapedTokenLocations: shiftedEscapedTokenLocations,
		});

		const tokenAfterEscapeCharacter = tokens.find(token => token.startIndex === escapeCharacterIndex);
		if (tokenAfterEscapeCharacter) {
			input = inputWithoutEscapeCharacter;
			escapedTokenLocations = [...shiftedEscapedTokenLocations, toEscapedTokenLocation(tokenAfterEscapeCharacter)];
			escapeCharacterIndex = input.indexOf(ESCAPE_CHARACTER, escapeCharacterIndex);
		}
		else {
			escapeCharacterIndex = input.indexOf(ESCAPE_CHARACTER, escapeCharacterIndex + 1);
		}
	}

	return { input, escapedTokenLocations };
}
