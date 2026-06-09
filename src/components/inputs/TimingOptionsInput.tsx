import { useState, useEffect } from 'react';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import DatetimeInput from './DatetimeInput';
import DurationInput from './DurationInput';
import CheckboxInput from './CheckboxInput';

interface Props {
  value: TaskTimingOptions;
  onChange: (value: TaskTimingOptions) => void;
}

const DEFAULT_DURATION = 1000 * 60 * 30;

export default function TimingOptionsInput({ value, onChange }: Props) {
  const [local, setLocal] = useState<TaskTimingOptions>(value);

  useEffect(() => { setLocal(value); }, [value]);

  function update(patch: Partial<TaskTimingOptions>) {
    const next = { ...local, ...patch };

    // Auto-sync maxDuration when minDuration changes
    if ('minDuration' in patch && patch.minDuration !== undefined) {
      next.maxDuration = patch.minDuration;
    }

    setLocal(next);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <DatetimeInput
        label="Start time"
        value={local.startTime}
        onChange={startTime => update({ startTime })}
      />
      <DatetimeInput
        label="End time"
        value={local.endTime}
        onChange={endTime => update({ endTime })}
      />
      <DatetimeInput
        label="Deadline"
        value={local.deadline}
        onChange={deadline => update({ deadline })}
      />
      <DurationInput
        label="Min duration"
        value={local.minDuration}
        onChange={minDuration => update({ minDuration })}
      />
      <DurationInput
        label="Max duration"
        value={local.maxDuration}
        onChange={maxDuration => update({ maxDuration })}
      />
      <div className="flex items-center gap-2">
        <CheckboxInput
          value={local.repeatInterval !== null}
          onChange={checked => update({ repeatInterval: checked ? DEFAULT_DURATION : null })}
          label="Repeating"
        />
      </div>
      {local.repeatInterval !== null && (
        <DurationInput
          label="Repeat interval"
          value={local.repeatInterval}
          onChange={repeatInterval => update({ repeatInterval })}
        />
      )}
      <CheckboxInput
        value={local.isMandatory}
        onChange={isMandatory => update({ isMandatory })}
        label="Mandatory"
      />
    </div>
  );
}

export { DEFAULT_DURATION };
