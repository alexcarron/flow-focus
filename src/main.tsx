import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { startRecurringTaskTick, useTasksStore } from './stores/tasksStore';
import { enableMapSet } from 'immer';

enableMapSet();
startRecurringTaskTick();

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.repeat) return;
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    useTasksStore.getState().undo();
  } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    useTasksStore.getState().redo();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
