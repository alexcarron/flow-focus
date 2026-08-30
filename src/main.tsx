import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { startRecurringTaskTick, useTasksStore } from './stores/tasksStore';
import { enableMapSet } from 'immer';

enableMapSet();
startRecurringTaskTick();

window.addEventListener('keydown', (event: KeyboardEvent) => {
	if (event.repeat) return;
	if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
		event.preventDefault();
		useTasksStore.getState().undo();
	} else if (event.ctrlKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
		event.preventDefault();
		useTasksStore.getState().redo();
	}
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter basename={import.meta.env.DEV ? '/' : '/flow-focus'}>
			<App />
		</BrowserRouter>
	</StrictMode>
);
