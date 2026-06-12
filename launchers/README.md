# Setting Up a One-Click Launcher (Windows)

This guide lets you open FlowFocus with a single click

## How the app runs

FlowFocus is built as a static site and served by the shared **Local Web Apps hub**
(`../../hub`) on **http://localhost:4200**. The app itself lives at
**http://localhost:4200/flow-focus**.

The hub is meant to run all the time (via `pm2`, restarted on login — see
`../../hub/README.md`). The launcher scripts here just open your browser to the
app's URL, but they also know how to start the hub if it isn't running yet.

## Step 1: Pick a launcher script

Two launcher scripts are included in this folder:

| Script | What it does |
|--------|-------------|
| `start-flow-focus.bat` | Starts the hub in a **minimised** terminal window if needed, then opens your browser to `/flow-focus`. Simple and easy to debug. |
| `start-flow-focus-hidden.vbs` | Same, but with **no visible window at all**. |

Both scripts check whether the hub is already running (port 4200) before starting it.

**Recommendation:** Start with `start-flow-focus.bat`. Switch to `start-flow-focus-hidden.vbs` once everything works.

## Stopping the server

Run `stop-flow-focus.bat` to stop the shared hub. Note that this also stops every
other app served from the hub (e.g. Activity Wheel) — use `../../hub/stop-hub.bat`
directly if you want that to be clearer.

## Rebuilding after a change

FlowFocus is served from its `dist/` folder. After editing source code, run:

```bash
npm run build
```

The hub picks up the new build immediately — no restart needed.

## Step 2: Create a Windows shortcut

You cannot pin a `.bat` or `.vbs` file directly to the taskbar. Windows requires a `.lnk` shortcut file. Here's how to create one.

### For `start-flow-focus.bat`

1. Right-click `start-flow-focus.bat` in File Explorer 
2. Click **Create shortcut**
3. Right-click the new shortcut
4. Click **Properties**.
5. In **Target**, prefix the path with `cmd /c `:
   ```
   cmd /c "C:\Users\username\local-web-apps\flow-focus\launchers\start-flow-focus.bat"
   ```
4. Set **Start in** to the launchers folder:
   ```
   C:\Users\username\local-web-apps\flow-focus\launchers
   ```
5. Change **Run** to **Minimized** so the terminal flashes away instantly
6. Click **Change Icon…**
7. Browse to `..\public\favicon.ico`
8. Click **OK**.

### For `start-flow-focus-hidden.vbs`

1. Right-click `start-flow-focus-hidden.vbs`
2. Click **Create shortcut**
3. Right-click the shortcut.
4. Click **Properties**
5. Change **Target** to run it through `wscript`:
   ```
   wscript "C:\Users\username\local-web-apps\flow-focus\launchers\start-flow-focus-hidden.vbs"
   ```
6. Set **Start in** to the launchers folder
7. Click **Change Icon…**
8. Browse to `..\public\favicon.ico`
9. Click **OK**.

## Step 3: Pin to the taskbar

1. Move or copy the shortcut to your **Desktop**.
2. Right-click the shortcut on the Desktop.
3. Choose **Show more options** > **Pin to taskbar**.

## Step 4: Pin to the Start menu (optional)

1. Right-click the shortcut.
2. Choose **Pin to Start**.
