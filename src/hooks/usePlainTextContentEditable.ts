import { useCallback } from 'react';

const nativeFormattingShortcutKeys = new Set(['b', 'i', 'u']);

function isNativeFormattingShortcut(event: React.KeyboardEvent): boolean {
	return (event.ctrlKey || event.metaKey) && nativeFormattingShortcutKeys.has(event.key.toLowerCase());
}

export function usePlainTextContentEditable() {
	const onKeyDown = useCallback((event: React.KeyboardEvent) => {
		if (isNativeFormattingShortcut(event)) {
			event.preventDefault();
		}
	}, []);

	const onPaste = useCallback((event: React.ClipboardEvent) => {
		event.preventDefault();
		const pastedPlainText = event.clipboardData.getData('text/plain');
		document.execCommand('insertText', false, pastedPlainText);
	}, []);

	return { onKeyDown, onPaste };
}
