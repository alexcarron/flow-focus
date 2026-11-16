import { cloneElement, useRef, useState } from 'react';
import { useOutsideClickAndEscape } from '../hooks/useOutsideClickAndEscape';
import { useKeepElementInViewport } from '../hooks/useKeepElementInViewport';
import ChevronDownIcon from './svg-icons/ChevronDownIcon';
import styles from './FilterDropdown.module.css';

interface FilterDropdownOption<Value extends string | number> {
	value: Value;
	label: string;
	description: string;
}

interface Props<Value extends string | number> {
	value: Value;
	options: FilterDropdownOption<Value>[];
	onChange: (value: Value) => void;
	icon?: React.ReactElement<{ className?: string }>;
	className?: string;
}

export default function FilterDropdown<Value extends string | number>({ value, options, onChange, icon, className = '' }: Props<Value>) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const selectedOption = options.find(option => option.value === value) ?? options[0];

	const menuRef = useRef<HTMLUListElement>(null);

	useOutsideClickAndEscape(containerRef, isOpen, () => setIsOpen(false));
	useKeepElementInViewport(menuRef, isOpen);

	function selectOption(option: FilterDropdownOption<Value>) {
		onChange(option.value);
		setIsOpen(false);
	}

	return (
		<div ref={containerRef} className={`${styles.container} ${className}`}>
			<button
				type="button"
				onClick={() => setIsOpen(isCurrentlyOpen => !isCurrentlyOpen)}
				className={styles.trigger}
				title={selectedOption.description}
			>
				{icon && cloneElement(icon, { className: styles.prefixIcon })}
				{selectedOption.label}
				<ChevronDownIcon className={styles.caret} />
			</button>

			{isOpen && (
				<ul ref={menuRef} className={styles.menu} role="listbox">
					{options.map(option => (
						<li key={option.value}>
							<button
								type="button"
								role="option"
								aria-selected={option.value === value}
								title={option.description}
								onClick={() => selectOption(option)}
								className={option.value === value ? `${styles.option} ${styles.optionSelected}` : styles.option}
							>
								{option.label}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
