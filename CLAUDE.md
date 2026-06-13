# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowFocus is a React 18 + Vite task management app that surfaces one task at a time based on an automatic priority algorithm. The goal is to eliminate decision fatigue. The user sees only the most urgent task and interacts via complete/skip gestures.

## Commands

```bash
# Start dev server (port 5174, hot reload)
npm run dev

# Run tests (Vitest)
npm test

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

The app has no separate backend. Tasks are persisted to IndexedDB via Dexie.js.

### Local hub

In production-style local use, FlowFocus is built as a static site (`npm run build`)
and served by the shared hub at `../hub` alongside other local web apps, at
`http://localhost:4200/flow-focus`. This requires `base: '/flow-focus/'` in
`vite.config.ts` and `<BrowserRouter basename="/flow-focus">` in `src/main.tsx` —
both already set. After changing source code, re-run `npm run build` for the hub
to pick up the change (no hub restart needed). During active development, use
`npm run dev` (port 5174) for hot reload instead.

On Windows, `launchers/start-flow-focus.bat` (or `launchers/start-flow-focus-hidden.vbs`)
starts FlowFocus's own dev server if it isn't already running and opens `/flow-focus/`
in the browser. `launchers/stop-flow-focus.bat` stops that dev server. See
`launchers/README.md` for details, including how to use the shared hub instead.

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

`useTasksStore` (`src/stores/tasksStore.ts`) is the single source of truth. It holds a `tasks: Task[]` reactive state backed by a module-level `TasksManager` instance. All routes are simple components that read from and write to the store.

### Core Domain Model (`src/model/`)

- **`Task`** — central entity with description, optional steps (`Map<string, StepStatus>`), timing fields (`startTime`, `endTime`, `deadline`, min/max duration in ms, `repeatInterval`), and `isMandatory` flag. Has a `dbId` property for Dexie row identity. Has `static [immerable] = true` for Immer compatibility.
- **`TasksManager`** — owns the `Task[]` array, provides `getPriorityTask`, `getTasksInPriorityOrder`, `update`, and `deleteTask`. A single module-level instance is kept in `tasksStore.ts`.
- **`TaskPrioritizer`** — pure sorting logic. See [`docs/task-priority-algorithm.md`](docs/task-priority-algorithm.md) for the full algorithm.
- **`task/TaskState.ts`**, **`task/TaskTimingOptions.ts`**, **`task/StepStatus.ts`** — supporting types: `TaskState` is the undo/redo snapshot shape, `TaskTimingOptions` is the timing-only subset used by forms/popups, `StepStatus` is the `Completed | Skipped | Uncomplete` enum for steps.
- **`TaskRefiner.ts`** — interface for AI-assisted task editing (clarify, split, generate steps). Not implemented; the `@google/generative-ai` dependency is currently unused.

### State Management (`src/stores/tasksStore.ts`)

`useTasksStore` is a Zustand store with Immer middleware that:
- Holds `tasks: Task[]`, `isLoading`, `undoStack`, `redoStack`
- Exposes mutation actions: `completeNextStep`, `completeAllSteps`, `skipNextStep`, `deferTask`, `setDescription`, `setSteps`, `setStep`, `setDeadline`, `setMandatory`, `setTimingOptions`, `setComplete`, `setStepComplete`, `addTask`, `deleteTask`
- All undoable mutations go through `executeWithPatches()` which snapshots `TaskState[]` before/after, generates Immer patches, and pushes to `undoStack`
- Exports `selectPriorityTask` and `selectTasksInPriorityOrder` selectors
- Exports `startRecurringTaskTick()` — call once in `main.tsx`

Important: `setAutoFreeze(false)` is called to allow mutating Task class instances that live in the Zustand state.

### Settings (`src/stores/settingsStore.ts`)

`useSettingsStore` is a separate Zustand store (no Immer) holding `AppSettings` (`src/model/AppSettings.ts`): `morningTime`/`nightTime` (used by quick-set buttons on datetime inputs) and `bedtime`/`wakeTime` (the sleep window). Persisted to the Dexie `settings` table. Changing `bedtime`/`wakeTime` calls `tasksManager.setAsleepTimeWindow()`, which feeds into `Task.getTimeToComplete()`. Loaded once via `loadSettings()` in `App.tsx`.

### Persistence (`src/db/`)

- **`FlowFocusDB`** (`src/db/flowfocus.db.ts`) — Dexie database with `tasks` and `settings` tables (v2 schema).
- **`serializeTask` / `deserializeRow`** (`src/db/task.serializer.ts`) — convert between `Task` instances and plain `PlainTaskRow` objects.

### Backup & Restore (`src/utils/backup.ts`)

A JSON export/import system, exposed via buttons on `/settings`:
- `createBackup()` builds a `BackupData` object (`{ format: 'flow-focus-backup-v1', exportedAt, settings, tasks }`) from the current `useTasksStore`/`useSettingsStore` state. Each task's `stepsToStatusMap` is written as a plain `{ [step]: StepStatus }` object and dates as ISO strings for readability.
- `downloadBackup(data, filenamePrefix)` downloads a pretty-printed JSON file (`<prefix>-<timestamp>.json`) via a `Blob` + anchor tag.
- `readBackupFile(file)` / `isBackupData(value)` parse and validate an imported file.
- `applyBackup(data)` calls `importSettings()` (settingsStore) and `importTasks()` (tasksStore), which fully replace current settings/tasks (clearing Dexie tables and the undo/redo stacks) and reconstruct `Task` instances the same way `loadTasks()` does.
- Importing is destructive and requires user confirmation; if tasks exist beforehand, the current state is silently auto-exported first (`flow-focus-pre-import-backup-*.json`) as a safety net.
- Exported files download via the browser; `backups/` is the intended local folder for keeping them (gitignored, except `.gitkeep`).

### Undo/Redo

`executeWithPatches(action)` in the store:
1. Snapshots `TaskState[]` before the action
2. Runs the action (mutates Task objects in-place)
3. Snapshots `TaskState[]` after
4. Uses `produceWithPatches(before, recipe)` (tuple return form) to generate forward + inverse patches
5. Pushes entry to `undoStack`, clears `redoStack`

`undo()` / `redo()` apply Immer patches to TaskState[] then call `task.restoreState()` for each task.

Global keyboard shortcuts: `Ctrl+Z` = undo, `Ctrl+Y` / `Ctrl+Shift+Z` = redo (wired in `main.tsx`).

### Pages / Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `FocusPage` | Shows the single highest-priority task; Enter or double-tap = complete next step |
| `/tasks` | `TasksManagerPage` | Full task list with filter, sort, inline edit, delete |
| `/create-task` | `TaskCreatorPage` | Form to create a new task with all timing options |
| `/settings` | `SettingsPage` | Edit `AppSettings` (time shortcuts, sleep window) via `useSettingsStore` |

### Components (`src/components/`)

- **`TaskCard`** — displays the priority task. Editable description (contenteditable) and current step. Progress bar, time-left, skip/complete buttons, timing options popup.
- **`SkipPopup`** — modal overlay for choosing how long to defer a task.
- **`TimingOptionsPopup`** — modal overlay for editing all timing fields of a task.
- **Input components** (`src/components/inputs/`): `TextInput`, `NumberInput`, `DurationInput`, `DatetimeInput`, `ArrayInput`, `CheckboxInput`, `TimingOptionsInput`.

### Hooks & Utilities

- `src/hooks/useShrinkToFit.ts` — ResizeObserver-based hook that shrinks an element to fit without wrapping.
- `src/utils/formatters.ts` — `formatTime(ms)` and `formatDate(date)` pure functions.
- `src/config/shortcuts.ts` — central keyboard shortcut definitions (`SHORTCUTS`) plus `matchesShortcut`/`formatShortcut` helpers, used by the timing/duration inputs and `TaskCreatorPage`.

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
