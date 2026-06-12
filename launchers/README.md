# Setting Up a One-Click Launcher (Windows)

This guide lets you open FlowFocus with a single click

## How the app runs

Running `npm start` in the project folder starts a local Vite development server on **http://localhost:4200**. The app is fully self-contained.

## Step 1: Pick a launcher script

Two launcher scripts are included in the project root:

| Script | What it does |
|--------|-------------|
| `start-flow-focus.bat` | Starts the dev server in a **minimised** terminal window, then opens your browser. Simple and easy to debug. |
| `start-flow-focus-hidden.vbs` | Starts the server with **no visible window at all**. Cleaner experience but slightly harder to diagnose if something goes wrong. |

Both scripts check whether the server is already running before starting a new one.

**Recommendation:** Start with `start-flow-focus.bat`. Switch to `start-flow-focus-hidden.vbs` once everything works.

## Stopping the server

Run `stop-flow-focus.bat` to kill whatever process is listening on port 4200. Useful if the dev server gets stuck or you started it from a launcher and want to shut it down cleanly.

## Step 2: Create a Windows shortcut

You cannot pin a `.bat` or `.vbs` file directly to the taskbar. Windows requires a `.lnk` shortcut file. Here's how to create one.

### For `start-flow-focus.bat`

1. Right-click `start-flow-focus.bat` in File Explorer 
2. Click **Create shortcut**
3. Right-click the new shortcut
4. Click **Properties**.
5. In **Target**, prefix the path with `cmd /c `:
   ```
   cmd /c "C:\Users\username\repos\flow-focus\start-flow-focus.bat"
   ```
4. Set **Start in** to the project folder:
   ```
   C:\Users\username\repos\flow-focus
   ```
5. Change **Run** to **Minimized** so the terminal flashes away instantly
6. Click **Change Icon…**
7. Browse to `public\favicon.ico`
8. Click **OK**.

### For `start-flow-focus-hidden.vbs`

1. Right-click `start-flow-focus-hidden.vbs`
2. Click **Create shortcut**
3. Right-click the shortcut.
4. Click **Properties**
5. Change **Target** to run it through `wscript`:
   ```
   wscript "C:\Users\username\repos\flow-focus\start-flow-focus-hidden.vbs"
   ```
6. Set **Start in** to the project folder
7. Click **Change Icon…**
8. Browse to `public\favicon.ico`
9. Click **OK**.

## Step 3: Pin to the taskbar

1. Move or copy the shortcut to your **Desktop**.
2. Right-click the shortcut on the Desktop.
3. Choose **Show more options** > **Pin to taskbar**.

## Step 4: Pin to the Start menu (optional)

1. Right-click the shortcut.
2. Choose **Pin to Start**.
