import { useEffect, useRef, useState } from 'react';
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
	className?: string;
}

export default function FilterDropdown<Value extends string | number>({ value, options, onChange, className = '' }: Props<Value>) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const selectedOption = options.find(option => option.value === value) ?? options[0];

	useEffect(() => {
		if (!isOpen) return;

		function closeIfClickedOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		}

		window.addEventListener('mousedown', closeIfClickedOutside);
		return () => window.removeEventListener('mousedown', closeIfClickedOutside);
	}, [isOpen]);

	function selectOption(option: FilterDropdownOption<Value>) {
		onChange(option.value);
		setIsOpen(false);
	}

	return (
		<div ref={containerRef} className={`${styles.container} ${className}`}>
			<button
				type="button"
				onClick={() => setIsOpen(isCurrentlyOpen => !isCurrentlyOpen)}
				className="button small outlined"
				title={selectedOption.description}
			>
				{selectedOption.label}
				<span className={styles.caret}>▾</span>
			</button>

			{isOpen && (
				<ul className={styles.menu} role="listbox">
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
