from pathlib import Path

# PATH CONFIG
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"

# CLASS LIST (5 CLASSES)
CLASS_NAMES = ["Grenade", "Knife", "Missile", "Pistol", "Rifle"]

# MATRIX HACKER THEME COLORS
BG = "#020b02"
SIDEBAR_BG = "#020f06"
PANEL_BG = "#031a09"
BTN_BG = "#052b11"
BTN_HOVER = "#0a3d1a"
TEXT = "#00ff41"
MUTED = "#00aa55"
ACCENT = "#00ff41"
ACCENT_SOFT = "#004d1f"
