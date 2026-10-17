const FLASH_DURATION_MILLISECONDS = 700;

export function flashElementWithAccentColor(element: HTMLElement) {
	const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (shouldReduceMotion) return;

	const elementStyle = getComputedStyle(element);
	const accentColor = elementStyle.getPropertyValue('--color-accent').trim();
	element.animate(
		[
			{
				offset: 0,
				backgroundColor: accentColor,
				color: accentColor,
			},
		],
		{
			duration: FLASH_DURATION_MILLISECONDS,
			easing: 'ease-out',
		},
	);
}
