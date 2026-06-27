import os
import shutil
import subprocess
import platform
import urllib.parse
from pathlib import Path


def resolve_browser(browser_name_or_path: str) -> str | None:
    if not browser_name_or_path:
        return None
    candidate = browser_name_or_path.strip()
    if platform.system() == "Windows":
        if not candidate.lower().endswith(".exe"):
            paths_to_try = [
                candidate,
                candidate + ".exe",
                rf"C:\Program Files\{candidate}\{candidate}.exe",
                rf"C:\Program Files (x86)\{candidate}\{candidate}.exe",
                rf"C:\Program Files\{candidate}.exe",
                rf"C:\Program Files (x86)\{candidate}.exe",
            ]
            for p in paths_to_try:
                if Path(p).exists():
                    return str(Path(p).resolve())
        elif Path(candidate).exists():
            return str(Path(candidate).resolve())
        return None
    resolved = shutil.which(candidate)
    if resolved:
        return resolved
    return None


def launch_url(url: str, browser_path: str | None = None):
    url = url.strip()
    parsed = urllib.parse.urlparse(url)
    if not parsed.scheme:
        url = "https://" + url
    if browser_path:
        resolved = resolve_browser(browser_path)
        if resolved:
            subprocess.Popen([resolved, url], shell=False)
            return
    if platform.system() == "Windows":
        os.startfile(url)
    elif platform.system() == "Darwin":
        subprocess.Popen(["open", url])
    else:
        subprocess.Popen(["xdg-open", url])


def launch_executable(path: str):
    p = Path(path).expanduser().resolve()
    if not p.exists():
        raise FileNotFoundError(f"Executable not found: {p}")
    if p.is_file():
        subprocess.Popen([str(p)], shell=False, cwd=str(p.parent))
    else:
        subprocess.Popen([str(p)], shell=False)


def launch_console(command: str, show_terminal: bool = True):
    if not command or not command.strip():
        raise ValueError("No command provided")
    if platform.system() == "Windows":
        if show_terminal:
            subprocess.Popen(f'start "Reuse Hub - Console" cmd /k "{command}"', shell=True)
        else:
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = subprocess.SW_HIDE
            subprocess.Popen(
                ["cmd", "/c", command],
                shell=False,
                startupinfo=si,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
    else:
        if show_terminal:
            terminal = os.environ.get("TERM", "x-terminal-emulator")
            subprocess.Popen([terminal, "-e", command])
        else:
            subprocess.Popen(command, shell=True)
