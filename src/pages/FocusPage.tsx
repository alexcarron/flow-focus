import { useEffect, useRef } from 'react';
import { useTasksStore, selectPriorityTask } from '../stores/tasksStore';
import TaskCard from '../components/TaskCard';

export default function FocusPage() {
  const priorityTask = useTasksStore(selectPriorityTask);
  const completeNextStep = useTasksStore(s => s.completeNextStep);

  const lastTapTime = useRef(0);
  const tapCount = useRef(0);
  const DOUBLE_TAP_THRESHOLD = 400;

  // Enter key → complete next step
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || !priorityTask) return;
      const focused = document.activeElement as HTMLElement;
      if (
        focused.matches('button, input, select') ||
        focused.hasAttribute('contenteditable')
      ) return;

      if (
        e.key === 'Enter' &&
        !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey
      ) {
        completeNextStep(priorityTask);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [priorityTask, completeNextStep]);

  // Double-tap → complete next step
  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (
      target.hasAttribute('contenteditable') ||
      target.matches('button, input, select, textarea')
    ) return;

    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_THRESHOLD) {
      tapCount.current++;
    } else {
      tapCount.current = 1;
    }
    lastTapTime.current = now;

    if (tapCount.current === 2 && priorityTask) {
      completeNextStep(priorityTask);
      tapCount.current = 0;
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-full p-6"
      onTouchStart={onTouchStart}
    >
      {priorityTask ? (
        <TaskCard task={priorityTask} />
      ) : (
        <p className="text-gray-500 text-lg">Nothing to do right now</p>
      )}
    </div>
  );
}
