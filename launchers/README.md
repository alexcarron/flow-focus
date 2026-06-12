# Setting Up a One-Click Launcher (Windows)

This guide lets you open FlowFocus with a single click.

## Option 1: Standalone (use this if you just cloned this repo)

These scripts start FlowFocus's own dev server (`npm run dev`, port 5174) if it isn't already running, then open your browser to `http://localhost:5174/flow-focus/`.

| Script | What it does |
|--------|-------------|
| `start-flow-focus-standalone.bat` | Starts the dev server in a **minimised** terminal window if needed, then opens your browser. Simple and easy to debug. |
| `start-flow-focus-standalone-hidden.vbs` | Same, but with **no visible window at all**. |

Both scripts check whether the dev server is already running (port 5174) before starting it. The very first run also installs dependencies (`npm install`), which can take a minute. Every run after that is instant.

**Recommendation:** Start with `start-flow-focus-standalone.bat`. Switch to `start-flow-focus-standalone-hidden.vbs` once everything works.

### Stopping the server

Run `stop-flow-focus-standalone.bat` to stop FlowFocus's dev server.

## Option 2: Local Web Apps hub (extra, optional)

This option only works if you have the bigger `local-web-apps` folder set up, with a `hub` folder next to this `flow-focus` folder (see the main `README.md` for what that is). If you only cloned this standalone `flow-focus` repo, you won't have that folder. Use Option 1 above instead.

| Script | What it does |
|--------|-------------|
| `start-flow-focus.bat` | Starts the shared hub in a **minimised** terminal window if needed, then opens your browser to `http://localhost:4200/flow-focus`. |
| `start-flow-focus-hidden.vbs` | Same, but with **no visible window at all**. |

Both scripts check whether the hub is already running (port 4200) beforestarting it. The hub is meant to run all the time (via `pm2`, restarted on login. See `../../hub/README.md`).

### Stopping the server

Run `stop-flow-focus.bat` to stop the shared hub. Note that this also stops every other app served from the hub (e.g. Activity Wheel). Use `../../hub/stop-hub.bat` directly if you want that to be clearer.

### Rebuilding after a change

The hub serves FlowFocus from its `dist/` folder, not from source. After editing source code, run:

```bash
npm run build
```

The hub picks up the new build immediately. No restart is needed.

## Creating a Windows Shortcut

You cannot pin a `.bat` or `.vbs` file directly to the taskbar. Windows requires a `.lnk` shortcut file. Here's how to create one for whichever script you picked above.

### For a `.bat` script

1. Right-click the script in File Explorer
2. Click **Create shortcut**
3. Right-click the new shortcut
4. Click **Properties**
5. In **Target**, prefix the path with `cmd /c `:
   ```
   cmd /c "C:\Users\username\flow-focus\launchers\start-flow-focus-standalone.bat"
   ```
6. Set **Start in** to the launchers folder:
   ```
   C:\Users\username\flow-focus\launchers
   ```
7. Change **Run** to **Minimized** so the terminal flashes away instantly
8. Click **Change Icon…**
9. Browse to `..\public\favicon.ico`
10. Click **OK**

### For a `.vbs` script

1. Right-click the script
2. Click **Create shortcut**
3. Right-click the shortcut
4. Click **Properties**
5. Change **Target** to run it through `wscript`:
   ```
   wscript "C:\Users\username\flow-focus\launchers\start-flow-focus-standalone-hidden.vbs"
   ```
6. Set **Start in** to the launchers folder
7. Click **Change Icon…**
8. Browse to `..\public\favicon.ico`
9. Click **OK**

## Pin to the Taskbar

1. Drag the `.lnk` shortcut to the taskbar.

OR

1. Move or copy the shortcut to your **Desktop**.
2. Right-click the shortcut on the Desktop.
3. Choose **Show more options** > **Pin to taskbar**.

## Pin to the Start Menu

1. Right-click the shortcut.
2. Choose **Pin to Start**.
