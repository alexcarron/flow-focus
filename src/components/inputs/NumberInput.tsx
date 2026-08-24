interface Props {
	value: number | null;
	onChange: (value: number | null) => void;
	min?: number;
	max?: number;
	step?: number;
	placeholder?: string;
	className?: string;
}

export default function NumberInput({ value, onChange, min, max, step = 1, placeholder, className = '' }: Props) {
	return (
		<input
			type="number"
			value={value ?? ''}
			min={min}
			max={max}
			step={step}
			placeholder={placeholder}
			className={`field ${className}`}
			onChange={e => {
				const v = e.target.value;
				onChange(v === '' ? null : parseFloat(v));
			}}
		/>
	);
}
