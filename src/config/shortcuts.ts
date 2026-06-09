export type ShortcutDef = {
  key: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
};

// ─── Shortcut definitions ────────────────────────────────────────────────────

export const SHORTCUTS = {
  datetime: {
    today:   { key: 't', },
    morning: { key: 'm', },
    night:   { key: 'n', },
    nextDay: { key: 'arrowup',   shift: true },
    prevDay: { key: 'arrowdown', shift: true },
    clear:   { key: 'backspace', alt: true },
  },
  duration: {
    increment1:  { key: 'arrowup' },
    decrement1:  { key: 'arrowdown' },
    increment10: { key: 'arrowup',   shift: true },
    decrement10: { key: 'arrowdown', shift: true },
    unitSeconds: { key: 's', },
    unitMinutes: { key: 'm', },
    unitHours:   { key: 'h', },
    unitDays:    { key: 'd', },
    unitWeeks:   { key: 'w', },
    clear:       { key: 'backspace', alt: true },
  },
  taskCreator: {
    submit: { key: 'enter', ctrl: true },
    blur:   { key: 'escape' },
    clear:  { key: 'backspace', alt: true },
  },
} as const satisfies Record<string, Record<string, ShortcutDef>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type KeyboardLike = {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
};

export function matchesShortcut(e: KeyboardLike, def: ShortcutDef): boolean {
  return (
    e.key.toLowerCase() === def.key.toLowerCase() &&
    !!e.altKey   === !!def.alt &&
    !!e.ctrlKey  === !!def.ctrl &&
    !!e.shiftKey === !!def.shift
  );
}

const KEY_DISPLAY: Record<string, string> = {
  arrowup:    '↑',
  arrowdown:  '↓',
  arrowleft:  '←',
  arrowright: '→',
  enter:      'Enter',
  escape:     'Esc',
};

export function formatShortcut(def: ShortcutDef): string {
  const parts: string[] = [];
  if (def.ctrl)  parts.push('Ctrl');
  if (def.alt)   parts.push('Alt');
  if (def.shift) parts.push('Shift');
  const keyLabel = KEY_DISPLAY[def.key.toLowerCase()] ?? def.key.toUpperCase();
  parts.push(keyLabel);
  return parts.join('+');
}
