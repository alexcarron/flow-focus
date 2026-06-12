# FlowFocus

A task manager that only shows you one task at a time (whatever's' most important right now) so you don't have to decide what to do next.

## How to Run It Yourself

- Make sure you have [Node.js](https://nodejs.org/) installed
- Clone this repo
- Open a terminal in the `flow-focus` folder
- Run `npm install`
- Run `npm run dev`
- Open [http://localhost:5174](http://localhost:5174) in your browser

Your tasks are saved in your browser (via IndexedDB). No account or server is needed.

### Running it as part of the Local Web Apps hub

This repo can also live inside a bigger `local-web-apps` folder alongside other apps, which run together from one shared local server (the "hub") at `http://localhost:4200`.

This only works if you have that bigger folder set up, with a `hub` folder next to this `flow-focus` folder. If you only cloned this standalone `flow-focus` repo, you won't have the hub. Just use `npm run dev` above instead.

If you do have the hub set up:

- Run `npm run build`
- Start the hub (see `../hub/README.md`)
- Open [http://localhost:4200/flow-focus](http://localhost:4200/flow-focus)

On Windows, `launchers/start-flow-focus.bat` does both of these for you and opens the app in your browser. See `launchers/README.md`.

## Usage Examples

Here are a few examples of the things you can do in Flow Focus with screenshots.

### Creating a New Task

![Create Task Empty Form](./screenshots/create-task.png)

![Create Task Filled Out Form](./screenshots/filled-out-create-task-form.png)

### Putting off a Task Until Later

![Skipping a Task](./screenshots/skip-task.png)

![Putting off a Task Until Later](./screenshots/put-off-task.png)

### Completing a Step of a Task

![Completing a Step of a Task](./screenshots/complete-step.png)

### Editing a Step of a Task

![Editing the Current Step of a Task](./screenshots/edit-current-step.png)

### Editing the Time of a Task

![Highlighting the Time of a Task](./screenshots/highlight-task-time.png)

![Editing the Time of a Task](./screenshots/edit-task-time.png)

### Managing Your Tasks

![Managing Your Tasks](./screenshots/manage-tasks.png)

### Editing a Task in the Task Manager

![Editing a Task in the Task Manager](./screenshots/edit-task-in-manager.png)

### Filtering Tasks By Completion Date As Today

![Filtering Tasks By Completion Date As Today](./screenshots/filter-tasks.png)

### Sorting Tasks By Name

![Sorting Tasks By Name](./screenshots/sort-tasks.png)

### Changing Time Shortcuts and Sleep Schedule Settings

![All Settings](./screenshots/all-settings.png)

![Editing Settings](./screenshots/editing-settings.png)

### Backing Up Your Data

![Backup and Restore](./screenshots/backup-and-restore.png)

![Backup Exported](./screenshots/backup-exported.png)

![Imported Backup](./screenshots/imported-backup.png)
