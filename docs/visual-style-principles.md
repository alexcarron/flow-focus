# FlowFocus Visual Style Principles

FlowFocus exists to reduce decision fatigue by surfacing one task at a time. The visual style should feel calm and quiet, never busy or distracting, so new UI should follow these principles.

1. Quiet by default, only what needs attention stands out. Backgrounds are near-black and low-contrast, and the indigo accent color is the only element that pulls focus. Never add a second bright color, besides warning and danger states.

2. Danger is a state you hover into, not one that shouts at rest. Destructive affordances are muted text or icon color at rest, and only intensify to a filled danger color on hover or press.

3. No motion for its own sake. Nothing in the app animates open or close today, so new floating UI should appear and disappear instantly too, unless a future need proves otherwise.

4. One consistent floating surface language. Anything that floats above content, like modals and context menus, uses the same building blocks: a dark surface background, a subtle border, rounded corners, a dialog shadow, and the same spacing scale.

5. Decisions are minimized, so confirmations are rare but real. The app deliberately shows one task at a time to avoid decision fatigue, but destructive, irreversible actions still get one deliberate, in-app confirmation. Never a native browser prompt.

6. Every click gets a visible response. Clicking a button or menu item must visibly change on press, not just on hover, so the user always feels their click registered.
