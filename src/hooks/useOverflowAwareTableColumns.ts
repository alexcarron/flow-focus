import { useLayoutEffect, useRef, useState } from 'react';

const EMPTY_HIDDEN_COLUMN_KEYS = new Set<string>();

export function useOverflowAwareTableColumns<ColumnKey extends string>(hideColumnPriorityOrder: readonly ColumnKey[], isDisabled: boolean = false) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const tableRef = useRef<HTMLTableElement>(null);
	const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<ColumnKey>>(new Set());
	const [scrollContainerWidth, setScrollContainerWidth] = useState(0);
	const [tableContentWidth, setTableContentWidth] = useState(0);

	useLayoutEffect(() => {
		const scrollContainer = scrollContainerRef.current;
		const table = tableRef.current;
		if (!scrollContainer || !table) return;

		const scrollContainerResizeObserver = new ResizeObserver(entries => {
			setScrollContainerWidth(entries[0].contentRect.width);
		});
		scrollContainerResizeObserver.observe(scrollContainer);

		const tableResizeObserver = new ResizeObserver(entries => {
			setTableContentWidth(entries[0].contentRect.width);
		});
		tableResizeObserver.observe(table);

		return () => {
			scrollContainerResizeObserver.disconnect();
			tableResizeObserver.disconnect();
		};
	}, []);

	useLayoutEffect(() => {
		if (isDisabled) return;
		const scrollContainer = scrollContainerRef.current;
		const table = tableRef.current;
		if (!scrollContainer || !table) return;

		const isTableOverflowingContainer = table.scrollWidth > scrollContainer.clientWidth;
		if (!isTableOverflowingContainer) return;

		const nextColumnKeyToHide = hideColumnPriorityOrder.find(columnKey => !hiddenColumnKeys.has(columnKey));
		if (nextColumnKeyToHide !== undefined) {
			setHiddenColumnKeys(current => new Set(current).add(nextColumnKeyToHide));
		}
	}, [tableContentWidth, hiddenColumnKeys, hideColumnPriorityOrder, isDisabled]);

	useLayoutEffect(() => {
		if (isDisabled) return;
		const scrollContainer = scrollContainerRef.current;
		const table = tableRef.current;
		if (!scrollContainer || !table) return;

		const isTableOverflowingContainer = table.scrollWidth > scrollContainer.clientWidth;
		if (isTableOverflowingContainer) return;

		const mostRecentlyHiddenColumnKey = [...hideColumnPriorityOrder].reverse().find(columnKey => hiddenColumnKeys.has(columnKey));
		if (mostRecentlyHiddenColumnKey !== undefined) {
			setHiddenColumnKeys(current => {
				const next = new Set(current);
				next.delete(mostRecentlyHiddenColumnKey);
				return next;
			});
		}
	}, [scrollContainerWidth, hideColumnPriorityOrder, isDisabled]);

	return { scrollContainerRef, tableRef, hiddenColumnKeys: isDisabled ? EMPTY_HIDDEN_COLUMN_KEYS as Set<ColumnKey> : hiddenColumnKeys };
}
