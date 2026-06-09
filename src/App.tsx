import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useTasksStore } from './stores/tasksStore';
import FocusPage from './pages/FocusPage';
import TasksManagerPage from './pages/TasksManagerPage';
import TaskCreatorPage from './pages/TaskCreatorPage';

export default function App() {
  const isLoading = useTasksStore(s => s.isLoading);
  const loadTasks = useTasksStore(s => s.loadTasks);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="flex gap-4 p-3 bg-gray-900 border-b border-gray-800">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-3 py-1 rounded text-sm font-medium transition-colors ${
              isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`
          }
        >
          Focus
        </NavLink>
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `px-3 py-1 rounded text-sm font-medium transition-colors ${
              isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`
          }
        >
          All Tasks
        </NavLink>
        <NavLink
          to="/create-task"
          className={({ isActive }) =>
            `px-3 py-1 rounded text-sm font-medium transition-colors ${
              isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`
          }
        >
          + Create
        </NavLink>
      </nav>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<FocusPage />} />
            <Route path="/tasks" element={<TasksManagerPage />} />
            <Route path="/create-task" element={<TaskCreatorPage />} />
          </Routes>
        </main>
      )}
    </div>
  );
}
