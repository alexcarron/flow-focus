const EDITABLE_TEXT_OR_MODAL_SELECTOR = '[contenteditable], input, textarea, .modal-overlay';

export function isNativeContextMenuTarget(target: EventTarget): boolean {
	return target instanceof Element && target.closest(EDITABLE_TEXT_OR_MODAL_SELECTOR) !== null;
}
