# Architecture

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 5 |
| UI | React 18 (functional components + hooks) |
| Language | TypeScript (strict mode) |
| State management | Zustand + Immer |
| Routing | React Router v6 |
| Styling | Tailwind CSS v4 |
| Persistence | Dexie.js (IndexedDB) |
| Testing | Vitest |
| Deployment | GitHub Pages |

## The Big Picture

Pages read from and call actions on the Zustand stores. The stores hold the live app state, run the domain logic, and persist changes to IndexedDB. Pages never talk to the database directly.

## Project Structure

| Folder | What's in it |
|---|---|
| `src/pages/` | The 4 routes: Focus, Task Manager, Create Task, Settings |
| `src/components/` | Reusable UI components (TaskCard, popups, form inputs) |
| `src/stores/` | Zustand stores (the source of truth for app state) |
| `src/model/` | Plain TypeScript domain logic (Task, TasksManager, TaskPrioritizer, time-math) |
| `src/db/` | Dexie database setup and converting between Task objects and DB rows |
| `src/hooks/`, `src/utils/`, `src/config/` | Small shared helpers |

## Core Concepts

### Task

The central object. Holds a description, an ordered list of steps, and timing info (start time, end time, deadline, min/max duration, repeat interval). All task behavior lives as methods on this class.

### TasksManager

Owns the full list of `Task`s. A single instance is created when the app starts and lives outside React. The `tasksStore` wraps it. Provides `getPriorityTask()` (for the Focus page) and `getTasksInPriorityOrder()` (for the Task Manager page).

### TaskPrioritizer

Pure logic that decides task order. See [task-priority-algorithm.md](task-priority-algorithm.md) for the full rules.

### Undo / Redo

Every change to a task goes through `executeWithPatches()` in `tasksStore`, which records an Immer patch describing the change. `Ctrl+Z` / `Ctrl+Y` walk these patches backward and forward.

## Persistence

Tasks and settings are saved to IndexedDB via Dexie as soon as they change. Data changes are saved automatically and not lost when closing the tab.

## Pages

| Route | Page | What it does |
|---|---|---|
| `/` | Focus | Shows the single most important task. |
| `/tasks` | Task Manager | Full list of tasks that you can filter, sort, edit, delete. |
| `/create-task` | Create Task | Form to add a new task with steps and timing options. |
| `/settings` | Settings | Sleep schedule and time-shortcut preferences for now. |
