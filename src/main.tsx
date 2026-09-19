import { ComponentType, StrictMode } from 'react';
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

const root = createRoot(document.getElementById('root')!);

const prototypingPathPrefix = '/prototyping/';
const isPrototypingRouteRequested = import.meta.env.DEV && window.location.pathname.startsWith(prototypingPathPrefix);

if (isPrototypingRouteRequested) {
	const requestedPrototypeName = window.location.pathname.slice(prototypingPathPrefix.length);
	const loadPrototypingRegistry = import.meta.glob('./prototyping/registry.ts')['./prototyping/registry.ts'] as
		(() => Promise<{ prototypeNameToComponent: Record<string, ComponentType> }>) | undefined;
	const loadPrototypeNotFound = import.meta.glob('./prototyping/PrototypeNotFound.tsx')['./prototyping/PrototypeNotFound.tsx'] as
		(() => Promise<{ default: ComponentType<{ requestedName: string; validNames: string[] }> }>) | undefined;

	if (loadPrototypingRegistry && loadPrototypeNotFound) {
		Promise.all([loadPrototypingRegistry(), loadPrototypeNotFound()]).then(([{ prototypeNameToComponent }, { default: PrototypeNotFound }]) => {
			const RequestedPrototypeComponent = prototypeNameToComponent[requestedPrototypeName];
			root.render(
				<StrictMode>
					{RequestedPrototypeComponent ? (
						<RequestedPrototypeComponent />
					) : (
						<PrototypeNotFound requestedName={requestedPrototypeName} validNames={Object.keys(prototypeNameToComponent)} />
					)}
				</StrictMode>
			);
		});
	}
} else {
	root.render(
		<StrictMode>
			<BrowserRouter basename={import.meta.env.DEV ? '/' : '/flow-focus'}>
				<App />
			</BrowserRouter>
		</StrictMode>
	);
}
