import { useMemo, useState } from 'react';
import Tag from '../model/tag/Tag';
import { TypedQuickInputTagMatch } from '../model/typed-quick-input/TypedQuickInputToken';

export default function useTaskTagSelection(config: {
	existingTags: Tag[];
	parsedTags: TypedQuickInputTagMatch[];
	onStripRangeFromName: (startIndex: number, endIndex: number) => void;
}) {
	const [manuallyAddedTagIDs, setManuallyAddedTagIDs] = useState<string[]>([]);
	const [manuallyAddedTagNames, setManuallyAddedTagNames] = useState<string[]>([]);

	const textSourcedTagIDs = useMemo(
		() => Array.from(new Set(config.parsedTags.filter(tag => tag.existingTagID !== null).map(tag => tag.existingTagID as string))),
		[config.parsedTags]
	);

	const textSourcedTagNames = useMemo(() => {
		const normalizedNameToOriginalCasing = new Map<string, string>();
		for (const tag of config.parsedTags) {
			if (tag.newTagName === null) continue;
			const trimmedName = tag.newTagName.trim();
			const normalizedName = trimmedName.toLowerCase();
			if (!normalizedNameToOriginalCasing.has(normalizedName)) normalizedNameToOriginalCasing.set(normalizedName, trimmedName);
		}
		return Array.from(normalizedNameToOriginalCasing.values());
	}, [config.parsedTags]);

	const alreadyAddedTagIDs = useMemo(
		() => Array.from(new Set([...manuallyAddedTagIDs, ...textSourcedTagIDs])),
		[manuallyAddedTagIDs, textSourcedTagIDs]
	);

	const notYetAddedTagNames = useMemo(() => {
		const normalizedManualNames = new Set(manuallyAddedTagNames.map(name => name.toLowerCase()));
		const textOnlyNames = textSourcedTagNames.filter(name => !normalizedManualNames.has(name.toLowerCase()));
		return [...manuallyAddedTagNames, ...textOnlyNames];
	}, [manuallyAddedTagNames, textSourcedTagNames]);

	function selectExistingTag(tagID: string) {
		setManuallyAddedTagIDs(previous => previous.includes(tagID) ? previous : [...previous, tagID]);
	}

	async function createAndAddTag(name: string) {
		const trimmedName = name.trim();
		setManuallyAddedTagNames(previous => [...previous, trimmedName]);
	}

	function removeAlreadyAddedTag(tagID: string) {
		if (manuallyAddedTagIDs.includes(tagID)) {
			setManuallyAddedTagIDs(previous => previous.filter(existingTagID => existingTagID !== tagID));
			return;
		}
		const parsedTag = config.parsedTags.find(tag => tag.existingTagID === tagID);
		if (parsedTag) config.onStripRangeFromName(parsedTag.startIndex, parsedTag.endIndex);
	}

	function removeNotYetAddedTagName(name: string) {
		const normalizedName = name.toLowerCase();
		if (manuallyAddedTagNames.some(existingName => existingName.toLowerCase() === normalizedName)) {
			setManuallyAddedTagNames(previous => previous.filter(existingName => existingName.toLowerCase() !== normalizedName));
			return;
		}
		const parsedTag = config.parsedTags.find(tag => tag.newTagName?.trim().toLowerCase() === normalizedName);
		if (parsedTag) config.onStripRangeFromName(parsedTag.startIndex, parsedTag.endIndex);
	}

	function isTagNameAlreadyUsed(name: string, excludingPendingName?: string): boolean {
		const normalizedName = name.trim().toLowerCase();
		const matchesExistingTag = config.existingTags.some(tag => tag.name.toLowerCase() === normalizedName);
		const matchesPendingTagName = notYetAddedTagNames.some(existingName => existingName !== excludingPendingName && existingName.toLowerCase() === normalizedName);
		return matchesExistingTag || matchesPendingTagName;
	}

	async function renameNotYetAddedTagName(oldName: string, newName: string) {
		const trimmedNewName = newName.trim();
		if (trimmedNewName === '') throw new Error('Tag name cannot be empty.');
		if (trimmedNewName !== oldName && isTagNameAlreadyUsed(trimmedNewName, oldName)) {
			throw new Error(`A tag named "${trimmedNewName}" already exists.`);
		}

		const normalizedOldName = oldName.toLowerCase();
		if (manuallyAddedTagNames.some(existingName => existingName.toLowerCase() === normalizedOldName)) {
			setManuallyAddedTagNames(previous => previous.map(existingName => existingName.toLowerCase() === normalizedOldName ? trimmedNewName : existingName));
			return;
		}

		const parsedTag = config.parsedTags.find(tag => tag.newTagName?.trim().toLowerCase() === normalizedOldName);
		if (parsedTag) config.onStripRangeFromName(parsedTag.startIndex, parsedTag.endIndex);
		setManuallyAddedTagNames(previous => [...previous, trimmedNewName]);
	}

	function reset() {
		setManuallyAddedTagIDs([]);
		setManuallyAddedTagNames([]);
	}

	return {
		alreadyAddedTagIDs,
		notYetAddedTagNames,
		selectExistingTag,
		createAndAddTag,
		removeAlreadyAddedTag,
		removeNotYetAddedTagName,
		isTagNameAlreadyUsed,
		renameNotYetAddedTagName,
		reset,
	};
}
