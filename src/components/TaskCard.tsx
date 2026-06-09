import { useState, useEffect, useRef } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import { useShrinkToFit } from '../hooks/useShrinkToFit';
import { formatDate } from '../utils/formatters';
import SkipPopup from './SkipPopup';
import TimingOptionsPopup from './TimingOptionsPopup';

interface Props {
  task: Task;
}

function getTimeString(ms: number): string {
  const isNegative = ms < 0;
  const abs = Math.abs(ms);

  const timeUnits = [
    { ms: 52.1775 * 7 * 24 * 3600000, name: 'year' },
    { ms: 7 * 24 * 3600000, name: 'week' },
    { ms: 24 * 3600000, name: 'day' },
    { ms: 3600000, name: 'hour' },
    { ms: 60000, name: 'minute' },
  ];

  for (const unit of timeUnits) {
    if (abs >= unit.ms) {
      const count = Math.floor(abs / unit.ms);
      return `${count} ${unit.name}${count !== 1 ? 's' : ''} ${isNegative ? 'ago' : 'left'}`;
    }
  }

  return '';
}

export default function TaskCard({ task }: Props) {
  const store = useTasksStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSkipOpen, setIsSkipOpen] = useState(false);
  const [isTimingOpen, setIsTimingOpen] = useState(false);
  const timeRef = useShrinkToFit<HTMLSpanElement>();

  const descRef = useRef<HTMLHeadingElement>(null);
  const nextStepRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync description contenteditable with task
  useEffect(() => {
    const el = descRef.current;
    if (el && el.textContent !== task.getDescription()) {
      el.textContent = task.getDescription();
    }
  }, [task.getDescription()]);

  // Sync next step contenteditable with task
  useEffect(() => {
    const el = nextStepRef.current;
    const step = task.getNextStep() ?? '';
    if (el && el.textContent !== step) {
      el.textContent = step;
    }
  }, [task.getNextStep()]);

  const deadline = task.getDeadline();
  const startTime = task.getStartTime();
  const timeUntilDeadline = task.getTimeUntilDeadline(currentTime);
  const timeLeftStr = timeUntilDeadline === Number.POSITIVE_INFINITY ? null : getTimeString(timeUntilDeadline);
  const progress = task.getProgress();
  const progressPct = progress * 94 + 3;
  const isSkippable = !task.isUrgent(currentTime);
  const previousSteps = task.getPreviousSteps();
  const nextStep = task.getNextStep();
  const upcomingSteps = task.getUpcomingSteps();

  function onDescriptionBlur(e: React.FocusEvent<HTMLHeadingElement>) {
    const newDesc = e.currentTarget.textContent ?? '';
    if (newDesc !== task.getDescription()) {
      store.setDescription(task, newDesc);
    }
  }

  function onNextStepBlur(e: React.FocusEvent<HTMLSpanElement>) {
    const newStep = e.currentTarget.textContent ?? '';
    if (nextStep !== null && newStep !== nextStep) {
      store.setStep(task, nextStep, newStep);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl max-w-xl w-full mx-auto">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Description */}
      <h2
        ref={descRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={onDescriptionBlur}
        className="text-2xl font-bold text-white outline-none cursor-text"
      />

      {/* Steps */}
      {task.hasNextStep() && (
        <div className="flex flex-col gap-1">
          {previousSteps.map(step => (
            <span key={step} className="text-sm text-gray-600 line-through">{step}</span>
          ))}

          {nextStep && (
            <span
              ref={nextStepRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={onNextStepBlur}
              className="text-base text-white font-medium outline-none cursor-text border-l-2 border-indigo-500 pl-2"
            />
          )}

          {upcomingSteps.map(step => (
            <span key={step} className="text-sm text-gray-500">{step}</span>
          ))}
        </div>
      )}

      {/* Time info */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {startTime && startTime > currentTime && (
          <span>Starts {formatDate(startTime)}</span>
        )}
        {deadline && (
          <span>Due {formatDate(deadline)}</span>
        )}
        {timeLeftStr && (
          <span
            ref={timeRef}
            className="font-semibold"
            style={{ maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {timeLeftStr}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {isSkippable && (
          <button
            onClick={() => setIsSkipOpen(true)}
            className="flex-1 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Skip
          </button>
        )}
        <button
          onClick={() => store.completeAllSteps(task)}
          className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
        >
          Complete Task
        </button>
        <button
          onClick={() => setIsTimingOpen(true)}
          className="py-2 px-3 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
          aria-label="Timing options"
          title="Timing options"
        >
          ⏱
        </button>
      </div>

      <SkipPopup task={task} isOpen={isSkipOpen} onClose={() => setIsSkipOpen(false)} />
      <TimingOptionsPopup task={task} isOpen={isTimingOpen} onClose={() => setIsTimingOpen(false)} />
    </div>
  );
}
