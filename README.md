<p align="center">
  <img src="https://img.shields.io/github/v/release/mobogreatthegreat/Reuse-Hub?include_prereleases&style=flat-square&color=blueviolet"/>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/python-3.11%2B-blue?style=flat-square&logo=python&logoColor=white&labelColor=1a1a2e">
    <img src="https://img.shields.io/badge/python-3.11%2B-blue?style=flat-square&logo=python">
  </picture>
  <img src="https://img.shields.io/badge/platform-win-purple?style=flat-square&labelColor=1a1a2e"/>
  <img src="https://img.shields.io/github/downloads/mobogreatthegreat/Reuse-Hub/total?color=brightgreen"/>
</p>

<h1 align="center">Reuse Hub</h1>
<p align="center">
  <em>A portable single-exe launcher for links, executables, and console commands - organized by colored categories.</em>
  <br>
</p>

<p align="center">
  <a href="#features">Features</a> -
  <a href="#running-app">Running App</a> -
  <a href="#running-from-source">From Source</a> -
  <a href="#configuration">Config</a> -
  <a href="#category-management">Categories</a> -
  <a href="#troubleshooting">Troubleshooting</a> -
  <a href="#contributing">Contributing</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Running App](#running-app)
- [Running from Source](#running-from-source)
  - [Prerequisites](#prerequisites)
  - [Windows Build](#windows-build)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
  - [Categories](#categories)
  - [Item Types](#item-types)
  - [Icons](#icons)
  - [Console Mode](#console-mode)
- [Category Management](#category-management)
- [First Run Behavior](#first-run-behavior)
- [Auto-Update](#auto-update)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
  - [Reporting Bugs](#reporting-bugs)
  - [Submitting Changes](#submitting-changes)
- [Transparency](#transparency)
- [License](#license)

---

## Overview

Reuse Hub is **two things in one**:

1. **A Python + FastAPI backend** (`server.py`) that manages a SQLite database of launcher items, handles CRUD for items and categories, and launches links / executables / console commands on request.
2. **An Electron desktop GUI** (`src-electron/`) that wraps the backend with a dark frosted-glass frameless window, colored category tabs, grid/list views, drag-and-drop reorder, and per-item icon support (including auto-extracted EXE icons).

Both are compiled into a **single portable executable** - no installation, no Python or Node.js required at runtime.

> [!NOTE]
> Reuse Hub is a local-only launcher. All data is stored in a local SQLite database (`data/hub.db`). No network requests, no telemetry, no accounts.

---

## Features

| Feature | Description |
|---------|-------------|
| **Unified launcher** | Launch websites, desktop apps, and console commands from one place |
| **Colored categories** | Each category gets a name and color - cards show colored borders, tabs show colored dots |
| **Category management** | Dedicated modal to add, rename, recolor, and delete categories independently of items |
| **Grid / List view** | Toggle between compact card grid and detailed list layout |
| **Drag-and-drop reorder** | Reorder items freely within a category; order persists across restarts |
| **EXE icon extraction** | Items without a custom icon auto-extract the icon from the executable file |
| **Image icon support** | Browse for any image file (PNG, JPG, ICO, SVG, etc.) as a custom icon per item |
| **Console commands** | Run shell commands in a visible terminal or silently in the background |
| **Custom browser** | Optionally open links in a specific browser by name or full path |
| **Right-click context menu** | Edit and Delete are accessible only through a right-click context menu |
| **Search** | Real-time filtering of items by name, path, or category |
| **Frameless frosted glass** | Clean dark UI with backdrop blur, custom title bar, and window controls |
| **Single-file portable exe** | Everything bundled into one executable - drop it anywhere and run |
| **Auto-update** | Checks GitHub Releases on startup and shows a banner when a newer version is available |

---

## Running App

The easiest way to use Reuse Hub is to download a pre-built release:

Download from the [Releases](https://github.com/mobogreatthegreat/Reuse-Hub/releases) page:

| File | Platform | Arch | Notes |
|------|----------|------|-------|
| `Reuse-Hub-x64-Win.exe` | Windows | x64 | Portable - extracts on first run |

No compilation needed - just download and run. The app creates a `data/` folder next to the executable on first launch to store the database and JSON export.

---

## Running from Source

Download the source code from the [Releases](https://github.com/mobogreatthegreat/Reuse-Hub/releases) page (or clone the repo) and compile it yourself.

### Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | FastAPI backend server |
| Node.js | 18+ | Electron desktop app |
| npm | (comes with Node) | Electron dependencies |

Install Python from [python.org](https://python.org/downloads) and Node.js from [nodejs.org](https://nodejs.org).

### Windows Build

```cmd
cd "Reuse Hub"
build.bat
```

The script automatically:
- Installs PyInstaller if missing
- Compiles the Python backend into `dist-backend/reuse-hub-backend.exe`
- Runs `electron-builder --win portable` to produce both:
  - `dist/win-unpacked/Reuse Hub.exe` - runs instantly with no extraction
  - `dist/Reuse Hub.exe` - portable single-file for distribution
- The backend exe is bundled as an extra resource (inside `resources/backend/`)

> [!NOTE]
> Future versions may support Linux and macOS builds, but currently only Windows is supported.

> [!IMPORTANT]
> On some systems, Windows Defender may hold a lock on extracted Electron files during builds. If you encounter lock errors, temporarily exclude the project directory from Windows Defender and retry.

---

## Project Structure

```
Reuse Hub/
├── db.py                      # SQLite database + category/item CRUD
├── launcher.py                # Launch logic (URL, executable, console)
├── server.py                  # FastAPI server with REST endpoints
├── requirements.txt           # Python dependencies
├── reuse-hub-backend.spec     # PyInstaller spec file
├── src-electron/              # Electron desktop app
│   ├── main.js                # Electron main process
│   ├── preload.js             # Context bridge (IPC API)
│   ├── package.json           # Electron dependencies & builder config
│   ├── renderer/
│   │   ├── index.html         # UI layout with modals
│   │   ├── styles.css         # Dark frosted glass theme
│   │   └── app.js             # Frontend logic
├── dist/                      # Build output (generated)
├── build.bat                  # Build script (backend + electron + SFX)
├── start.bat                  # Dev launcher
├── data/                      # SQLite DB + JSON export (generated)
├── dist-backend/              # PyInstaller output (generated)
└── build/                     # PyInstaller workdir (generated)
```

---

## Configuration

### Categories

Categories are stored in a dedicated `categories` table with a `name` and `color`. Each is shown as a tab in the top bar with a colored dot. New items are assigned a category from the dropdown; new categories can be created in the **Manage Categories** modal (click ✎ in the category bar).

Category colors are auto-assigned from a 15-color palette on first creation and can be changed at any time via a native color picker in the manage modal. Cards inherit their border color from their category.

### Item Types

| Type | Description | Example |
|------|-------------|---------|
| `link` | Opens a URL in your default browser (or a custom browser) | `https://spotify.com` |
| `executable` | Launches a local executable or shortcut | `C:\Apps\spotify.exe` |
| `console` | Runs a shell command with optional terminal visibility | `ping google.com -t` |

### Icons

- **Custom image**: Browse for any image file (PNG, JPG, ICO, SVG, etc.) in the Add/Edit modal.
- **Auto EXE icon**: If no image is set for an `executable` item, the app extracts the program's embedded icon using Electron's `app.getFileIcon()`.
- **Letter fallback**: If neither is available, a colored circle with the item's first letter is shown (color is deterministic based on the item name).

### Console Mode

Console-type items have a toggle in the Add/Edit modal:

- **Show terminal window** (default): Opens a new `cmd` window to run the command.
- **Run in background**: Runs silently with no visible window.

---

## Category Management

Open the **Manage Categories** modal by clicking the ✎ button at the right end of the category bar. From here you can:

- **Add** a new category - enter a name and pick a color, then click **Add**.
- **Recolor** - click the color swatch next to any category to open a native color picker. Changes apply instantly to all cards and tabs.
- **Delete** - click ✕ on a category row. Any items assigned to it are moved to Uncategorized.

> [!NOTE]
> The "Uncategorized" category is built-in and cannot be deleted. It serves as the default category for items that don't have one explicitly assigned. When you delete a non-empty category, all its items are reassigned to Uncategorized.

---

## First Run Behavior

When you launch Reuse Hub for the first time:

1. **Database creation** - A `data/` folder is created alongside the executable containing `hub.db` (SQLite) and `hub.json` (JSON export).
2. **Table setup** - The `items` and `categories` tables are created if they don't exist. A migration check adds the `console_mode` column if upgrading from an older schema.
3. **JSON import** - If an existing `hub.json` is found and the database is empty, items are imported from the JSON file.
4. **Category seeding** - Any categories found in imported items are added to the `categories` table with auto-assigned colors.
5. **Backend start** - The Python backend starts on a random available port and waits for the Electron window to connect.

> [!IMPORTANT]
> The backend server runs as a child process of the Electron app. When you close the window, the backend is terminated automatically.

---

## Auto-Update

On startup, Reuse Hub checks [GitHub Releases](https://github.com/mobogreatthegreat/Reuse-Hub/releases) for a newer version. If one is found, a green banner appears below the title bar with a download link.

The check compares semver tags (e.g., `v1.0.1`) against the local version using the [GitHub API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release). No personal data is sent.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Open Add Item modal |
| `Escape` | Close modal / context menu |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't launch / no window | Check Task Manager for lingering `Reuse Hub.exe` or `reuse-hub-backend.exe` processes and kill them. Restart the app. |
| Items missing after update | The database is preserved across versions - check `data/hub.db` exists and has data. The JSON export at `data/hub.json` is a backup. |
| Build lock errors | Add a Windows Defender exclusion for the project directory, or restart and retry. |
| Console command doesn't show window | The "Show terminal window" option was unchecked in the item settings. Edit the item and re-enable it. |
| EXE icon not showing | Some older executables don't embed icon resources. The app falls back to the colored first-letter display. |
| Category won't delete | Items are automatically moved to Uncategorized when a category is deleted. Only the built-in Uncategorized category itself cannot be deleted. |
| Lost window off-screen | Window position is not persisted. Delete `data/hub.db` (backup first) to reset, or adjust your monitor configuration. |

---

## Contributing

### Reporting Bugs

If you encounter a bug, please [open an issue](https://github.com/mobogreatthegreat/Reuse-Hub/issues) with:

- A clear title and description
- Steps to reproduce the behavior
- Expected vs actual behavior
- Screenshots or error logs (if applicable)
- Your platform and Reuse Hub version

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes:
   - For UI changes: run `start.bat` from the project root
   - For backend changes: run `python server.py` directly
   - To start Electron directly: `cd src-electron && npm start`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

**Code style guidelines:**
- Python: Follow PEP 8, use type hints, keep functions focused
- JavaScript: ES6+ syntax, `const`/`let` over `var`, camelCase
- CSS: Use CSS custom properties via `:root` blocks, match the dark frosted glass theme
- No inline comments in source code unless explaining a non-obvious decision
- Match the existing code style and conventions

---

## Transparency

Reuse Hub was developed with assistance from various AI models for parts of the codebase and documentation. The core logic and backend implementation were written by the project maintainer (@mobogreatthegreat).

The Electron framework and FastAPI are open-source projects that power the desktop and backend layers respectively. Reuse Hub is an independent project - all data stays local and no external services are contacted at runtime.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Built with Python, FastAPI, and Electron. Portable single-exe launcher for Windows.</sub>
  <br>
  <sub>Reuse Hub is not affiliated with any of the referenced tools or libraries.</sub>
</p>
