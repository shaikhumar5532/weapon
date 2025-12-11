"""Shared runtime context for UI and detection modules."""
from types import SimpleNamespace

# UI refs (populated by ui.build_ui)
root = None
panel = None
status_label = None
detail_label = None
log_text = None
log_images = []

# Loader / animation refs
loader_canvas = None
animation_running = False

# Control flags
stop_all = False

# Model placeholder
model = None
