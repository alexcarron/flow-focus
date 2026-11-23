# Glossary

Use these terms everywhere: in the app, the code, the docs, and when talking about FlowFocus.

Every task date includes a time of day, but it's still always called a date.

## Task Dates

### Start Date

The earliest you can work on a task. Until then, the task stays hidden from the Focus page.

Words or phrases you can type in quick add to set a start date:

- starts
- start
- starting
- from
- after (unless naming a task)
- not before

### Target Date

When you'd ideally like the task done. Missing it just means your plan slipped, so a target date never makes a task urgent.

The app shows it as "Ideally" followed by the date (e.g. Ideally Fri 11pm).

Words or phrases you can type in quick add to set a target date:

- by
- want to finish by
- aim for
- aim to finish by
- ideally by
- "want to" or "try to" at the start of the task, with "by" and a date later on (e.g. want to play Celeste by sunday)
- a date with nothing in front of it (e.g. play Celeste sunday)

### Due Date

When the task has to be done. Only a due date can make a task urgent.

The app shows it as "Due" followed by the date (e.g. Due Sun 11pm).

Words or phrases you can type in quick add to set a due date:

- due
- deadline
- must be done by
- has to be done by
- have to be done by
- no later than
- can't finish after
- can't do after
- "have to" or "has to" at the start of the task, with "by" and a date later on (e.g. have to finish homework by sunday)

"Can't" can also be typed as "cant" or "cannot".

## Sequences

### Do After

How a task waits for other tasks to be completed before it shows up. The app shows it as "Do after" followed by the earlier task's name (e.g. Do after: Wash Dishes), and the field for picking them is called "Do after tasks".

In quick add, type "after" followed by the start of an existing task's name, or pick a task from the suggestions that show up. The typed words have to cover at least the whole first word of the task's name, and no other task's name can start with the same words unless they're one task's whole name. If no task matches, "after" is read as a start date word instead.

### Earlier Task (Prerequisite Task)

A task that has to be completed before a later task shows up. In the code it's called a prerequisite task.

### Later Task (Task Depending on Task / Dependent Task)

A task that waits for one or more earlier tasks. It stays hidden from the Focus page until every one of its earlier tasks is completed. In the code it's called a task depending on its earlier task or a dependent task

### Sequence

A chain of tasks linked by earlier and later tasks. Recurring tasks can't be in a sequence.

### Sequence Due Date Slack

A task's due date slack, but also counting its later tasks: the smallest of its own due date slack and each later task's sequence due date slack minus the longest this task could take. This lets the first available task in a sequence move up and become urgent when a later task's due date needs it to.

### Sequence Target or Due Date Slack

The same as sequence due date slack, but measured to each task's target or due date.

## Prioritization

### Due Date Slack

How much spare time you have before a task's due date, after setting aside the longest the task could take.

### Less Due Date Slack

The priority rule that puts a task whose due date slack runs out before the end of today ahead of a task that only has its target date pushing it.

## Focus Page

### Temporarily Focused Task

A task you picked from the upcoming tasks list on the Focus page, which takes the place of the priority task until you complete or skip it. It also ends if a different task takes the top of the priority order, or if the task stops being focusable. The Focus page shows "Temporarily focused" on its card. Undoing the completion or skip brings it back.

## No Longer Used Terms

### End Time

Don't use this. Tasks no longer disappear after a set time, and a date the task can't be done after is now its due date.

### Mandatory and Optional

Don't use these. Whether a date is a "want" or a "must" now comes from it being a target date or a due date.

### Deadline

Only use this as a word you can type in quick add to set a due date. Never use it as the name of a field, label, or anything in the code.
