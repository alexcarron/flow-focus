import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { prototypeNameToComponent } from './prototyping/registry';
import PrototypeNotFound from './prototyping/PrototypeNotFound';
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

const prototypingPathPrefix = '/prototyping/';
const isPrototypingRouteRequested = import.meta.env.DEV && window.location.pathname.startsWith(prototypingPathPrefix);
const requestedPrototypeName = isPrototypingRouteRequested ? window.location.pathname.slice(prototypingPathPrefix.length) : null;
const RequestedPrototypeComponent = requestedPrototypeName ? prototypeNameToComponent[requestedPrototypeName] : null;

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		{isPrototypingRouteRequested ? (
			RequestedPrototypeComponent ? (
				<RequestedPrototypeComponent />
			) : (
				<PrototypeNotFound requestedName={requestedPrototypeName!} validNames={Object.keys(prototypeNameToComponent)} />
			)
		) : (
			<BrowserRouter basename={import.meta.env.DEV ? '/' : '/flow-focus'}>
				<App />
			</BrowserRouter>
		)}
	</StrictMode>
);
