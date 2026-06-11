# Architecture & Tech Stack

THE FOLLOWING IS OUTDATED

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Angular 18 (standalone components, no NgModules) |
| Language | TypeScript 5.4 |
| UI component library | Angular Material 17 / CDK 17 |
| Local backend | json-server 1.x (dev only) |
| Cloud backend (alternative) | JSONBin.io REST API |
| AI | Google Gemini (`gemini-1.5-flash`) via `@google/generative-ai` |
| Unit tests | Jest 29 + ts-jest |
| Deployment | GitHub Pages via `angular-cli-ghpages` |

All inter-component communication uses Angular's built-in `@Input`/`@Output` and Angular Router. There is no state management library (no NgRx, no signals) — the domain model objects are shared directly through the router resolver.

---

## High-Level Architecture

```
Browser
 └── Angular App (port 4200)
       ├── AppComponent              ← global undo/redo keyboard shortcuts
       ├── RouterOutlet
       │    ├── FocusPageComponent   ← /
       │    ├── TasksManagerComponent← /tasks
       │    └── TaskCreatorComponent ← /create-task
       │
       └── (all routes resolved by TasksManagerResolver)
             │
             ▼
         TasksManager  ←────────────── json-server (port 3004)
         (domain model)                 json-server/tasksDatabase.json
               │
               ├── Task[]
               └── TaskPrioritizer (pure, stateless)
```

Every route resolves the same live `TasksManager` instance before rendering. The instance is shared by reference, so mutations in one component are immediately visible to others without any pub/sub.

---

## Domain Model (`src/model/`)

### `Task`

The central entity. Fields:

| Field | Type | Purpose |
|---|---|---|
| `description` | `string` | Task name / description |
| `stepsToStatusMap` | `Map<string, StepStatus>` | Ordered steps with status (`Completed`, `Skipped`, `Uncomplete`) |
| `startTime` | `Date \| null` | Earliest time the task can be worked on |
| `endTime` | `Date \| null` | Latest time the task can be worked on (not its deadline) |
| `deadline` | `Date \| null` | Hard deadline; drives all urgency calculations |
| `minRequiredTime` | `number \| null` | Best-case duration in milliseconds |
| `maxRequiredTime` | `number \| null` | Worst-case duration in milliseconds |
| `repeatInterval` | `number \| null` | Milliseconds between recurrences; `null` = one-time |
| `isMandatory` | `boolean` | Whether missing the deadline is unacceptable |
| `isComplete` | `boolean` | Whether the task is done |
| `isSkipped` | `boolean` | Whether the user deferred it for now |
| `lastActionedStep` | `{step, status} \| null` | Tracks the most recent step action for next-step logic |

`Task` holds a back-reference to its `TasksManager` (used for `getTimeToComplete` to access the sleep window, and to call `unSkipSkippedTasks` on completion).

Every mutating method on `Task` is decorated with `@NotifyStateChange`, which triggers auto-save after each mutation (see Persistence section).

#### Step Navigation Logic

The "next step" is not simply the first uncompleted step. The algorithm considers the last action taken:
- If the last action was a **complete**: return the first step that is not completed (in order).
- If the last action was a **skip**: first try the next skipped step after the last actioned step; if none, fall back to the first uncompleted step; if none, fall back to the first non-completed step.

This means repeated skipping cycles through skipped steps before returning to fresh ones, so the user eventually faces every step they deferred.

#### Recurring Tasks

A task becomes recurring by setting `repeatInterval` (milliseconds) and `startTime`. The interval end is `startTime + repeatInterval`. On every 1-second tick in `FocusPageComponent`, `TasksManager.update(currentTime)` checks all recurring tasks: if `currentTime > intervalEnd`, the task resets (all steps become uncomplete, `isComplete`/`isSkipped` cleared) and `startTime`/`deadline`/`endTime` are advanced by `repeatInterval` until the next interval is in the future.

### `TasksManager`

Owns `Task[]` and two system-wide configuration values:
- `asleepTimeWindow` — hardcoded `TimeWindow("0:00", "8:00")`, used to subtract sleep from deadline calculations.
- `downtimeTime` — `WeeklyDateRange(Saturday 00:00, Sunday 23:59)`, used by the disabled downtime comparator.

Also owns a special built-in recurring "Go To Sleep" task that recurs daily with a start time of midnight and a deadline of 8:00 AM.

Key methods:
- `addCreatedTask(description)` — creates and registers a new `Task`.
- `getPriorityTask(currentTime)` — delegates to `TaskPrioritizer`, returns the single task to show.
- `getTasksInPriorityOrder(currentTime)` — full sorted list for the Task Manager view.
- `update(currentTime)` — called every second; advances recurring tasks whose interval has expired.
- `deleteTask(task)` — removes by reference equality (`equals()` compares description + steps + times + interval).
- `restoreState(state)` — used by undo/redo to snap the entire task list to a saved snapshot.

### `TaskPrioritizer`

Stateless. Instantiated fresh on each call to `getPriorityTask` or `getTasksInPriorityOrder`. Contains all sorting and filtering logic. See [`priority-algorithm.md`](priority-algorithm.md) for the full algorithm.

### `TaskRefiner` (interface only)

Defines an AI-assisted task improvement contract:
- `createStepsForTask(task)` — decompose a task into actionable steps.
- `clarifyTask(task)` — rewrite a vague description to be unambiguous.
- `makeTaskActionable(task)` — ensure every step is a concrete action.
- `separateTask(task)` — split an unfocused task into multiple focused ones.

No implementation exists yet. `AIService` is available for when this gets built.

### `SortOrder` enum

Used by `TaskPrioritizer` comparators. `FIRST_BEFORE_SECOND = -1`, `SECOND_BEFORE_FIRST = 1`, `UNDETERMINED = 0`. Because `UNDETERMINED` and `FIRST_EQUAL_SECOND` both equal `0`, comparators chain with `||` — a `0` return falls through to the next comparator.

---

## Persistence Layer (`src/persistence/`)

### Observer Pattern

The persistence system is built on a simple observer contract:

```
StateObservable (interface)     StateObserver (interface)
  stateObserver: StateObserver    onStateChange(): void
```

Both `Task` and `TasksManager` implement `StateObservable` by holding a `stateObserver` reference. `PersistenceManager` implements `StateObserver` — its `onStateChange()` calls `saveObject()`.

The `@NotifyStateChange` TypeScript method decorator (in `src/persistence/observer/NotifyStateChangeDecorator.ts`) wraps any decorated method: after the original method runs, it calls `this.stateObserver.onStateChange()`. This gives automatic save-on-mutation without any explicit save calls in business logic.

### `PersistenceManager<T>` (abstract)

Manages load/save lifecycle:
- `loadObject()` — calls abstract `getLoadedObject()`, then either merges into the existing object via `Object.assign` (if already loaded) or stores it fresh, then immediately calls `saveObject()` to persist the canonical loaded state.
- `saveObject()` — delegates to abstract `saveNonNullObject()` only if an object is loaded.
- `onStateChange()` — calls `saveObject()`, wiring this into the observer chain.

### `JsonServer<T>` (active backend)

Uses Angular `HttpClient` to PUT/GET against `http://localhost:3004/tasksManager`. Save is fire-and-forget (no error handling shown to user). Requires the json-server process to be running.

### `JsonBinServer<T>` (cloud backend, not wired into active code)

Saves to JSONBin.io REST API using `fetch` directly (not Angular HttpClient, since it runs outside Angular's DI). Adds a **1-minute save cooldown** with a queued save: if a save is requested during cooldown, it schedules one save for when the cooldown ends rather than dropping the request. This prevents hammering the API on rapid mutations.

### `JsonToTasksManager` (serializer)

Handles `TasksManager` ↔ JSON:

**Loading:** Constructs a fresh `TasksManager`, then iterates the `tasks` array in JSON and calls `tasksManager.addCreatedTask(description)` for each, then deep-assigns all other fields. ISO date strings (`/^\d{4}-\d{2}-\d{2}T.../`) are auto-converted to `Date` objects during assignment. `stepsToStatusMap` is stored in JSON as an array of `[key, value]` pairs and reconstructed into a `Map`. Back-references (`stateObserver`, `tasksManager`) are excluded from the plain object after JSON parse.

**Saving:** JSON-serializes the `TasksManager` with a custom replacer that converts `Map` instances to arrays of entries and strips the `stateObserver` and `tasksManager` back-reference properties.

### `JsonSerializer<T>` (interface)

Defines the two-way converter contract: `convertJsonToObject(json, stateObserver)` and `convertObjectToJson(object)`. The `stateObserver` parameter on load is how the newly constructed domain objects get wired into the persistence chain.

---

## Undo/Redo System (`src/model/commands/`, `src/services/`)

### Command Pattern

`UndoableCommand` interface: `execute()`, `undo()`, `redo()`, `toString()`.

`EditTaskCommand` (abstract base) implements the snapshot approach:
1. On construction: captures `tasksStateBefore = task.getTasksManagerState()` — a full snapshot of all tasks.
2. `execute()` — calls abstract `doAction()`, then captures `tasksStateAfter`.
3. `undo()` — calls `task.restoreTasksManagerState(tasksStateBefore)`, which replaces the entire task array.
4. `redo()` — restores `tasksStateAfter`.

Snapshots are full `TasksManagerState` objects (all task fields, the sleep window, and the downtime range), so any mutation to any task is captured and reversible.

### Concrete Commands

| Command | Action |
|---|---|
| `CompleteTaskCommand` | `task.completeNextStep()` |
| `CompleteAllTaskCommand` | `task.completeAllSteps()` |
| `SkipTaskCommand` | `task.skipNextStep()` |
| `DeferTaskCommand` | Sets `task.startTime` to `now + deferMilliseconds` |
| `EditTaskDescriptionCommand` | `task.setDescription(newDescription)` |
| `EditTaskStepCommand` | `task.editStep(oldStep, newStep)` — replaces next step |
| `EditTaskStepsCommand` | `task.editSteps(newSteps)` — replaces all steps |
| `EditTaskDeadlineCommand` | `task.setDeadline(newDeadline)` |

### `CommandHistoryService`

Singleton Angular service. Holds two stacks: `commandsToUndo` and `commandsToRedo`.
- `execute(command)` — pushes to undo stack, calls `execute()`, clears redo stack.
- `undo()` — pops from undo stack, pushes to redo stack, calls `undo()`.
- `redo()` — pops from redo stack, pushes to undo stack, calls `redo()`.

Keyboard shortcuts are registered in `AppComponent` (`Ctrl+Z` = undo, `Ctrl+Y` / `Ctrl+Shift+Z` = redo). Repeat key events are ignored to prevent rapid-fire undo.

---

## Angular Application Layer (`src/app/`)

### Routing & Resolution

All three routes use the same `tasksManagerResolver`. The resolver:
1. Creates a `JsonServer<TasksManager>` instance.
2. Calls `loadObject()`, which fetches from json-server and wires the `PersistenceManager` as the `stateObserver`.
3. Returns the loaded `TasksManager`.

Components access it via `this.activatedRoute.snapshot.data['tasksManager']`. Because it's the same object reference for the lifetime of the app session, all three pages share live state — there is no re-fetch on navigation.

### Pages

**`FocusPageComponent` (`/`)**
- Shows the single highest-priority task by calling `tasksManager.getPriorityTask(currentTime)`.
- Ticks `tasksManager.update(currentTime)` every 1 second to check for recurring task resets.
- Complete: `Enter` key or double-click/double-tap (touch events handled manually with a 400 ms threshold).
- Skip: dedicated button on the `TaskComponent`.
- Both actions go through `CommandHistoryService` for undo support.
- Returns `null` (renders nothing) when no active task exists.

**`TasksManagerComponent` (`/tasks`)**
- Renders the full task list with inline editing.
- Filter options: None / Active (has deadline and is active) / Must Start Today.
- Sort columns: Priority / Name / Steps / Time Available / Duration / Repeat Interval — each toggles ascending/descending.
- Inline editing: description via `TextInputComponent`, steps via `TextInputComponent` (with Alt+ArrowLeft/Right to insert adjacent steps), completion checkboxes, mandatory checkboxes.
- Opens `TaskTimingOptionsPopupComponent` for full timing edits.
- Deletes call `tasksManager.deleteTask(task)` directly (no command, so not undoable).

**`TaskCreatorComponent` (`/create-task`)**
- Form for creating a new task: description, steps (list), timing options.
- Default duration is 30 minutes for both min and max.
- On create: calls `tasksManager.addCreatedTask(name)`, then applies all timing options to the new task.
- Does not use the command pattern — task creation is not undoable.

### `TaskComponent` (focus page's task view)

Receives a `Task` via `@Input` and emits `taskSkipped`/`taskCompleted` to `FocusPageComponent`.

Features:
- Displays description (content-editable `<h2>`), previous steps (read-only), current step (content-editable), upcoming steps (read-only), progress bar, time-left string, start/deadline dates.
- Description and step changes go through `EditTaskDescriptionCommand` / `EditTaskStepCommand`.
- "Skip" opens `SkipTaskPopupComponent` (choose defer duration, default 1 hour) → fires `DeferTaskCommand`.
- "Complete Task" button (complete all steps at once) fires `CompleteAllTaskCommand` directly.
- `ShrinkToFitDirective` applied to the time display so it shrinks to fit its container without wrapping.
- Ticks every 1 second to update the time-left display.

### Input Control System (`src/app/input-controls/`)

All input components implement `InputControlComponent<T>`:
```typescript
interface InputControlComponent<OutputType> {
  initialValue: OutputType | null
  onInputChange: EventEmitter<OutputType>
  setValue(value: OutputType | null): void
  onInput(event: Event): void
  clearInput(): void
}
```

| Component | Output type | Notes |
|---|---|---|
| `TextInputComponent` | `string \| null` | Content-editable `<span>` |
| `NumberInputComponent` | `number \| null` | Native `<input type="number">` |
| `CheckboxInputComponent` | `boolean` | Custom styled checkbox |
| `DurationInputComponent` | `number \| null` | Milliseconds; shows +/- 1 and +/- 10 buttons |
| `DatetimeInputComponent` | `Date \| null` | Wraps `<input type="datetime-local">` |
| `ArrayInputComponent` | `string[]` | Manages a dynamic list of text inputs |
| `SelectInputComponent` | generic | Wraps `<select>` |
| `TaskTimingOptionsInputComponent` | `TaskTimingOptions` | Composes the above into a single form; changing minDuration auto-syncs maxDuration |

`TaskTimingOptionsInputComponent` is the primary form used in both task creation and the timing popup. When min duration changes, it automatically sets max duration to the same value (the user can then diverge them manually).

### Popup System (`src/app/base-popup/`)

`BasePopupComponent<ConfirmationEmitType>` is a generic base class (not interface) for modal overlays. It shows/hides by toggling `display: block/none` on the host element directly. Clicks on the `.overlay` backdrop close it. It holds an `emittedConfirmation` value that is emitted when the user confirms.

Two concrete popups extend it:

**`TaskTimingOptionsPopupComponent`** — wraps `TaskTimingOptionsInputComponent`. On confirm, applies the timing options directly to its bound `Task` via `task.setFromTaskTimingOptions()`. Used in both `TaskComponent` (focus page) and `TasksManagerComponent`.

**`SkipTaskPopupComponent`** — wraps `DurationInputComponent` to choose how long to defer. Default: 1 hour. Emits a `Duration` which `TaskComponent` converts to a `DeferTaskCommand`.

---

## Directives & Pipes (`src/directives/`, `src/pipes/`)

### `ShrinkToFitDirective`

Applied with `[shrinkToFit]`. Computes the tightest width for an element that doesn't cause line-wrapping, by iteratively adjusting `style.width` and observing `offsetHeight` changes. Runs on `AfterViewInit` and `window:resize`.

### `TimeFormatterPipe`

Angular pipe (`timeFormatter`). Takes milliseconds, returns the largest whole unit (years → weeks → days → hours → minutes → seconds → milliseconds) as a human-readable string. Handles negative values by appending "ago" instead of "left". Used in the Task Manager duration columns.

### `DateFormatterPipe`

Angular pipe (`dateFormatter`). Used in the Task Manager to display dates.

---

## Time Management Utilities (`src/model/time-management/`)

| Class | Purpose |
|---|---|
| `Time` | Immutable hour/minute value; parses `"HH:MM"` strings |
| `Weekday` | Enum mapping weekday names to 0–6 |
| `StandardTimeUnit` | Enum + constant map of `TimeUnit` records (ms → years) |
| `Duration` | Wraps milliseconds with a `TimeUnit`; `fromMilliseconds` picks the largest exact-divisor unit |
| `TimeWindow` | Daily recurring time range (start `Time` → end `Time`); handles overnight wrap; used for sleep subtraction |
| `DateRange` | Start/end `Date` pair; `getDurationWithoutTimeWindow()` is the core sleep-subtraction calculation |
| `RecurringDateRange` | `DateRange` + `repeatInterval`; `isInRange(date)` checks if a date falls in any recurrence |
| `WeeklyDateRange` | Extends `RecurringDateRange` with a 7-day interval; constructed from weekday + time pairs |

`DateRange.getDurationWithoutTimeWindow(timeWindow)` works by:
1. If start is inside the sleep window, compute the overlap and subtract it.
2. If end is inside the sleep window, compute the overlap and subtract it.
3. Count the number of full calendar days in the adjusted range and subtract `days × timeWindow.getDuration()`.
4. Return `rawDuration - totalExcludedTime`.

---

## AI Integration (`src/services/ai.service.ts`)

`AIService` wraps `@google/generative-ai`. The API key is hardcoded as `'YOUR_API_KEY_HERE'` — this must be replaced to use AI features. The model is `gemini-1.5-flash`. Generations are capped at 2 per session via a counter (`numGenerations`), likely a cost-control measure during development.

The service is injectable but no component currently injects it. It is the intended backend for the `TaskRefiner` interface once implemented.
