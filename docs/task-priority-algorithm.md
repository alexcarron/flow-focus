# Task Priority Algorithm

**Source files:** `src/model/TaskPrioritizer.ts`, `src/model/task/Task.ts`, `src/model/time-management/DateRange.ts`

The algorithm decides which single task to surface on the Focus Page, and also determines the default sort order in the Task Manager.

First, it sorts all tasks, then is filters only the active, non-skipped tasks.

## Metric Definitions

### Active Task

A task is active when
- It has not been completed
- There is no start time or the start time is in the past or now
- There is no end time or the end time is in the future or now

A task is not active when it has been completed, hasn't started yet, or has passed.

### Available Time to Complete (aka Time to Complete)

The amount of real-world time you actually have to work on the task, measured from now to the deadline, with hours spent sleeping subtracted.

Calculated as infinite if there is no deadline or due date for the task.

If the tasks starts in the future, the available time to complete is from the start time to the deadline, otherwise from now to the deadline.

The sleep window is assumed to be 8 hours by default from midnight to 8am. Each full calendar day in the range subtracts 8 hours, but partial overlaps at the start and end of the range are handled by subtracting only the overlapping portion.

### Maximum Possible Task Duration (aka Worst-Case Task Duration)

How long the task could take to complete at most.

If the user did not set a maximum task duration, it is assumed to be the available time to complete or infinite if there is no deadline as to not underestimate the task duration.

### Minimum Possible Task Duration (aka Best-Case Task Duration)

How long the task will take to complete at minimum.

If the user did not set a minimum task duration, it is assumed to be 0 seconds.

### Minimum Slack Time (aka Worst-Case Breathing Room)

The minimum amount of time you can safely spend on doing other things before this task becomes impossible to complete in time.

Calculated by the avaiable time minus the maximum task duration for the task.

A task with no deadline is considered to have infinite slack time.

If the user did not set a maximum task duration, the slack time is calculated as 0 since the maximum task duration defaults to the entire available time to complete.

### Urgent Task 

A task is urgent if
- It has a deadline
- It is mandatory
- The minimum slack time is 0 or negative (i.e, available time to complete task is less than or equal to the maximum task duration)

### Task Progress

The ratio of completed steps to total steps, as a value 0–1 where no steps completed is `0` and all steps completed is `1`.

If a task has no steps, the progress is 0 if the task is not complete, and 1 if the task is complete.

## Step 1: Sort by Priority

### 1st Criterion: Active Over Inactive

Active tasks appear before inactive ones.

If both tasks are active, or both are inactive, the algorithm falls through to the next criterion.

**Why:** A completed, future-start, or past-end-time task (A task that can't be started right now) should never appear above something you can actually do right now. This should be true no matter the deadline

### 2nd Criterion: Mandatory Over Optional

A mandatory task appears before an optional task, but only if doing the optional task first would make the mandatory task impossible to finish on time.

This is determined by the sum of the maximum possible task duration for every non-mandatory task that is active and has a deadline before the mandatory task. If that exceeds the mandatory task's minimum slack time, the mandatory task is prioritized over the optional task.

In plain language: if there is less slack in the mandatory task than the total worst-case time of all optional tasks due before it, you can't afford to do those optional tasks first.

If there is enough slack, the mandatory/optional distinction is ignored here and the algorithm falls through to the next criterion. If both tasks are mandatory, or both are optional, the algorithm falls through to the next criterion.

**Why:** This avoids the a scenario where you spend all your time on nice-to-haves tasks and miss a hard commitment. However, it also doesn't blindly prioritize mandatory tasks. If you have plenty of time, optional tasks can appear first naturally based on their own deadlines.

### 3rd Criterion: Prefer Less Minimum Slack Time

The task with less minimum slack appears first.

If both tasks have equal slack, the algorithm falls through to the next criterion.

Tasks without deadlines have infinite slack time and sort to the bottom of this criterion

**Why:** Slack time measures how long you can delay starting a task before it becomes impossible. The task you have the least room to delay should be done first. This is the most important criterion for prioritizing tasks.

### 4th Criterion: Prefer Less Available Time to Complete

The task with less time available to complete (closer deadline relative to now) comes first.

If both tasks have equal time avaiable to complete, the algorithm falls through to the next criterion.

Tasks without deadlines have infinite available time to complete and sort to the bottom of this criterion

**Why:** When two tasks have identical slack, the one with the tighter deadline is more constrained and should be done first. If the deadline is closer, the task is more important.

### 5th Criterion: Prefer More Progress (tiebreaker)

The task with more progress towards its compelte comes first.

If both tasks have equal progress, the tasks are stable sorted by their creation date.

**Why:** If everything else is equal, finishing a task that is already partially done is better than context-switching to something untouched. It reduces the number of partially-done tasks in flight.

### Disabled Criterion: Downtime Deprioritization

A conditional criterion that would be enabled duration a set downtime window (Default configured to Saturday 00:00 – Sunday 23:59).

During that downtime window, optional tasks would be preferred over non-urgent mandatory tasks.

**Why:** This allows users to have a "rest mode" where mandatory work is deprioritized unless it's truly urgent.

## Step 2: Filter Out Tasks That Don't Qualify

After sorting, two filters are applied to the full sorted list.

### 1st Filter: Active Tasks Only

Removes all tasks that are not active

**Why:** If a task is not active, it cannot be started right now, so the user should see it or have it on their mind.

### 2nd Filter: No Skipped Tasks Unless Urgent

Removes all skipped tasks unless they are urgent tasks.

**Why:** If a task is skipped, the user does not want to do it right now. However, if it is an urgent task that must be completed, the user should see it. This lets the user defer low-priority tasks without losing track of mandatory ones that are running out of time.

When a task is completed, all tasks are un-skipped, so they reappear in the next cycle.

## Summary List

1. Sort by active status
2. Sort by mandatory status
3. Sort by less min slack time
4. Sort by less time to complete
5. Sort by more progress
6. Filter out inactive tasks
7. Filter out skipped tasks unless urgent
