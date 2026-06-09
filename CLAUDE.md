# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowFocus is a React 18 + Vite task management app that surfaces one task at a time based on an automatic priority algorithm. The goal is to eliminate decision fatigue. The user sees only the most urgent task and interacts via complete/skip gestures.

## Commands

```bash
# Start dev server (port 4200)
npm start

# Run tests (Vitest)
npm test

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

The app runs on port 4200. No separate backend — tasks are persisted to IndexedDB via Dexie.js.

## Tech Stack

| Concern | Technology |
|---|---|
| Build tool | Vite 5 |
| UI framework | React 18 (functional components + hooks only) |
| Language | TypeScript (strict mode) |
| State | Zustand + Immer middleware |
| Routing | React Router v6 |
| Styling | Tailwind CSS v4 |
| Persistence | Dexie.js (IndexedDB) |
| Undo/Redo | Immer patches (`produceWithPatches` / `applyPatches`) |
| Testing | Vitest |

## Architecture

### Data Flow

`useTasksStore` (`src/stores/tasksStore.ts`) is the single source of truth. It holds a `tasks: Task[]` reactive state backed by a module-level `TasksManager` instance. All three routes are simple components that read from and write to the store.

### Core Domain Model (`src/model/`)

- **`Task`** — central entity with description, optional steps (`Map<string, StepStatus>`), timing fields (`startTime`, `endTime`, `deadline`, min/max duration in ms, `repeatInterval`), and `isMandatory` flag. Has a `dbId` property for Dexie row identity. Has `static [immerable] = true` for Immer compatibility.
- **`TasksManager`** — owns the `Task[]` array, provides `getPriorityTask`, `getTasksInPriorityOrder`, `update`, and `deleteTask`. A single module-level instance is kept in `tasksStore.ts`.
- **`TaskPrioritizer`** — pure sorting logic. See [`docs/priority-algorithm.md`](docs/priority-algorithm.md) for the full algorithm.

### State Management (`src/stores/tasksStore.ts`)

`useTasksStore` is a Zustand store with Immer middleware that:
- Holds `tasks: Task[]`, `isLoading`, `undoStack`, `redoStack`
- Exposes mutation actions: `completeNextStep`, `completeAllSteps`, `skipNextStep`, `deferTask`, `setDescription`, `setSteps`, `setStep`, `setDeadline`, `setMandatory`, `setTimingOptions`, `setComplete`, `setStepComplete`, `addTask`, `deleteTask`
- All undoable mutations go through `executeWithPatches()` which snapshots `TaskState[]` before/after, generates Immer patches, and pushes to `undoStack`
- Exports `selectPriorityTask` and `selectTasksInPriorityOrder` selectors
- Exports `startRecurringTaskTick()` — call once in `main.tsx`

Important: `setAutoFreeze(false)` is called to allow mutating Task class instances that live in the Zustand state.

### Persistence (`src/db/`)

- **`FlowFocusDB`** (`src/db/flowfocus.db.ts`) — Dexie database with a single `tasks` table.
- **`serializeTask` / `deserializeRow`** (`src/db/task.serializer.ts`) — convert between `Task` instances and plain `PlainTaskRow` objects.

### Undo/Redo

`executeWithPatches(action)` in the store:
1. Snapshots `TaskState[]` before the action
2. Runs the action (mutates Task objects in-place)
3. Snapshots `TaskState[]` after
4. Uses `produceWithPatches(before, recipe)` (tuple return form) to generate forward + inverse patches
5. Pushes entry to `undoStack`, clears `redoStack`

`undo()` / `redo()` apply Immer patches to TaskState[] then call `task.restoreState()` for each task.

Global keyboard shortcuts: `Ctrl+Z` = undo, `Ctrl+Y` / `Ctrl+Shift+Z` = redo (wired in `main.tsx`).

### Three Pages / Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `FocusPage` | Shows the single highest-priority task; Enter or double-tap = complete next step |
| `/tasks` | `TasksManagerPage` | Full task list with filter, sort, inline edit, delete |
| `/create-task` | `TaskCreatorPage` | Form to create a new task with all timing options |

### Components (`src/components/`)

- **`TaskCard`** — displays the priority task. Editable description (contenteditable) and current step. Progress bar, time-left, skip/complete buttons, timing options popup.
- **`SkipPopup`** — modal overlay for choosing how long to defer a task.
- **`TimingOptionsPopup`** — modal overlay for editing all timing fields of a task.
- **Input components** (`src/components/inputs/`): `TextInput`, `NumberInput`, `DurationInput`, `DatetimeInput`, `ArrayInput`, `CheckboxInput`, `TimingOptionsInput`.

### Hooks & Utilities

- `src/hooks/useShrinkToFit.ts` — ResizeObserver-based hook that shrinks an element to fit without wrapping.
- `src/utils/formatters.ts` — `formatTime(ms)` and `formatDate(date)` pure functions.

### Time Management (`src/model/time-management/`)

`Duration`, `TimeWindow`, `DateRange`, `WeeklyDateRange`, `RecurringDateRange`, `Time`, `Weekday`, `StandardTimeUnit` — all pure TypeScript, no React dependencies.

## Tests

Tests live alongside source files as `*.test.ts`. Vitest is configured in `vite.config.ts` with `globals: true` and `environment: 'jsdom'`. Tests cover the pure domain model only — React components are not tested.

```bash
# Run all tests once
npx vitest run

# Run a single test file
npx vitest run src/model/task/Task.test.ts
```
