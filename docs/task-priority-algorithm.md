# Task Priority Algorithm

Source files: `src/model/TaskPrioritizer.ts`, `src/model/task/Task.ts`, `src/model/time-management/DateRange.ts`

The algorithm decides which single task to surface on the Focus Page, and also determines the default sort order in the Task Manager.

First, it sorts all tasks, then it filters only the active, non-skipped tasks.

See `docs/glossary.md` for what a start date, target date, and due date are.

## Metric Definitions

### Active Task

A task is active when
- It has not been completed
- There is no start date or the start date is in the past or now

A task is not active when it has been completed or hasn't started yet. Passing a target date or due date never makes a task inactive, so a task never disappears just because a date passed.

### Target or Due Date

The task's target date if it has one, otherwise its due date. This is the date the task is ordered by, since the target date is always on or before the due date.

### Available Time to Complete (aka Time to Complete)

The amount of real-world time you actually have to work on the task before a date, with hours spent sleeping subtracted. It is measured either to the due date or to the target or due date, depending on the criterion.

Calculated as infinite if the task has no such date.

If the task starts in the future, the available time to complete is from the start date to the date, otherwise from now to the date.

The sleep window is assumed to be 8 hours by default from midnight to 8am. Each full calendar day in the range subtracts 8 hours, but partial overlaps at the start and end of the range are handled by subtracting only the overlapping portion.

### Maximum Possible Task Duration (aka Worst-Case Task Duration)

How long the task could take to complete at most.

If the user did not set a maximum task duration, it is assumed to be the minimum task duration (which is 0 seconds when that is not set either). Tasks with no durations therefore compete on their dates instead of being treated as maximally urgent.

This assumed value is what slack, urgency, and the due date over target date only criterion use. It is separate from the maximum duration shown in the UI.

### Minimum Possible Task Duration (aka Best-Case Task Duration)

How long the task will take to complete at minimum.

If the user did not set a minimum task duration, it is assumed to be 0 seconds.

### Due Date Slack

The available time to complete before the due date, minus the maximum possible task duration. In other words, how long you can safely spend on other things before this task can't be finished by its due date.

A task with no due date has infinite due date slack.

### Target or Due Date Slack

The same as due date slack, but measured to the target or due date.

A task with neither date has infinite target or due date slack.

### Urgent Task

A task is urgent if its due date slack is 0 or negative (i.e. the available time before the due date is less than or equal to the maximum task duration).

Only a due date can make a task urgent. A missed target date never does.

### Task Progress

The ratio of completed steps to total steps, as a value 0–1 where no steps completed is `0` and all steps completed is `1`.

If a task has no steps, the progress is 0 if the task is not complete, and 1 if the task is complete.

## Step 1: Sort by Priority

### 1st Criterion: Active Over Inactive

Active tasks appear before inactive ones.

If both tasks are active, or both are inactive, the algorithm falls through to the next criterion.

Why: A completed or future-start task (a task that can't be started right now) should never appear above something you can actually do right now. This should be true no matter the dates.

### 2nd Criterion: Due Date Over Target Date Only

A task with a due date appears before a task without one, but only if doing the tasks without a due date first would make the due date impossible to meet.

This is determined by the sum of the maximum possible task duration for every active task that has no due date and has a target date before the due date task's due date. If that sum exceeds the due date task's due date slack, the due date task is prioritized.

In plain language: if there is less slack before the due date than the total worst-case time of all the tasks you'd only like to get done before it, you can't afford to do those first.

If there is enough slack, the distinction is ignored here and the algorithm falls through to the next criterion. If both tasks have a due date, or neither does, the algorithm falls through to the next criterion.

Why: This avoids spending all your time on things you'd like to do and missing something you have to do. However, it doesn't blindly put due dates first. If you have plenty of time, tasks with only a target date can still come first based on their own dates.

### 3rd Criterion: Less Due Date Slack

A task whose due date slack runs out before the end of today appears before a task whose due date slack doesn't. A task with only a target date never has its due date slack run out.

If both tasks' due date slack runs out today, or neither does, the algorithm falls through to the next criterion.

Why: A due date is a must and a target date is a want. When a due date has to be started today, it should come before anything that only a target date is pushing. Limiting this to today keeps a due date weeks away from jumping ahead of something you'd like to do today.

### 4th Criterion: Prefer Less Target or Due Date Slack

The task with less target or due date slack appears first.

If both tasks have equal slack, the algorithm falls through to the next criterion.

Tasks with neither date have infinite slack and sort to the bottom of this criterion.

Why: Slack measures how long you can delay starting a task before you miss its date. The task you have the least room to delay should be done first. Measuring to the target date when there is one means tasks are ordered by when you'd like them done, while criteria 2 and 3 make sure due dates are still met.

### 5th Criterion: Prefer Less Available Time to Complete

The task with less available time to complete before its target or due date comes first.

If both tasks have equal available time to complete, the algorithm falls through to the next criterion.

Tasks with neither date have infinite available time to complete and sort to the bottom of this criterion.

Why: When two tasks have identical slack, the one with the closer date is more constrained and should be done first.

### 6th Criterion: Prefer More Progress (tiebreaker)

The task with more progress towards its completion comes first.

If both tasks have equal progress, the tasks are stable sorted by their creation date.

Why: If everything else is equal, finishing a task that is already partially done is better than context-switching to something untouched. It reduces the number of partially-done tasks in flight.

### Disabled Criterion: Downtime Deprioritization

A conditional criterion that would be enabled during a set downtime window (Default configured to Saturday 00:00 – Sunday 23:59).

During that downtime window, tasks without a due date would be preferred over non-urgent tasks with a due date.

Why: This allows users to have a "rest mode" where work that has to be done is deprioritized unless it's truly urgent.

## Step 2: Filter Out Tasks That Don't Qualify

After sorting, two filters are applied to the full sorted list.

### 1st Filter: Active Tasks Only

Removes all tasks that are not active.

Why: If a task is not active, it cannot be started right now, so the user shouldn't see it or have it on their mind.

### 2nd Filter: No Skipped Tasks Unless Urgent

Removes all skipped tasks unless they are urgent tasks.

Why: If a task is skipped, the user does not want to do it right now. However, if its due date can no longer be met unless it's started now, the user should see it. This lets the user defer tasks without losing track of ones that have to be done and are running out of time.

When a task is completed, all tasks are un-skipped, so they reappear in the next cycle.

## Summary List

1. Sort by active status
2. Sort by due date over target date only
3. Sort by less due date slack
4. Sort by less target or due date slack
5. Sort by less time to complete
6. Sort by more progress
7. Filter out inactive tasks
8. Filter out skipped tasks unless urgent
