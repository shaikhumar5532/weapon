import platform
import random
import time
from pathlib import Path
from PIL import Image, ImageTk, ImageEnhance
import tkinter as tk

from . import context
from . import config


def play_beep():
    try:
        if platform.system() == "Windows":
            import winsound
            winsound.Beep(1200, 120)
        else:
            if context.root:
                context.root.bell()
    except Exception:
        try:
            if context.root:
                context.root.bell()
        except Exception:
            pass


def log(msg: str):
    if context.log_text is None:
        return
    context.log_text.config(state="normal")
    prefix = random.choice(["[MATRIX]", "[CORE]", "[NODE-01]", "[SYS]", "[SCAN]"])
    context.log_text.insert("end", f"{prefix} {msg}\n")
    context.log_text.see("end")
    context.log_text.config(state="disabled")


def add_thumbnail_to_log(pil_img: Image.Image, label: str):
    try:
        thumb = pil_img.copy()
        thumb.thumbnail((150, 100))

        enhancer = ImageEnhance.Color(thumb)
        thumb = enhancer.enhance(1.5)

        border = 4
        neon_img = Image.new("RGB", (thumb.width + border*2, thumb.height + border*2), (0, 40, 0))
        neon_img.paste(thumb, (border, border))

        px = neon_img.load()
        for y in range(0, neon_img.height, 3):
            for x in range(neon_img.width):
                r, g, b = px[x, y]
                px[x, y] = (r//3, g//3, b//3)

        imgtk = ImageTk.PhotoImage(neon_img)
        context.log_images.append(imgtk)

        context.log_text.config(state="normal")
        context.log_text.image_create("end", image=imgtk)
        context.log_text.insert("end", f"  {label}\n\n")
        context.log_text.see("end")
        context.log_text.config(state="disabled")

    except Exception as e:
        log(f"ERROR sci-fi thumbnail -> {e}")


def on_enter(event):
    event.widget["background"] = config.BTN_HOVER


def on_leave(event):
    event.widget["background"] = config.BTN_BG


def show_image(path: Path):
    try:
        img = Image.open(path).resize((800, 500))
        img_tk = ImageTk.PhotoImage(img)
        if context.panel:
            context.panel.config(image=img_tk)
            context.panel.image = img_tk
    except Exception as e:
        log(f"ERROR showing image -> {e}")


def start_loader():
    if context.animation_running:
        return

    context.animation_running = True

    from tkinter import Canvas
    context.loader_canvas = Canvas(context.panel, width=200, height=200, bg=config.PANEL_BG, highlightthickness=0)
    context.loader_canvas.place(relx=0.5, rely=0.5, anchor="center")
    animate_loader()


def stop_loader():
    context.animation_running = False
    if context.loader_canvas:
        try:
            context.loader_canvas.destroy()
        except Exception:
            pass
        context.loader_canvas = None


_angle = 0


def animate_loader():
    global _angle

    if not context.animation_running or context.loader_canvas is None:
        return

    canvas = context.loader_canvas
    canvas.delete("all")

    cx, cy = 100, 100
    r1, r2 = 60, 40

    canvas.create_oval(cx-r1, cy-r1, cx+r1, cy+r1, outline=config.ACCENT, width=3)

    canvas.create_arc(cx-r1, cy-r1, cx+r1, cy+r1,
                      start=_angle, extent=110,
                      style="arc", outline=config.ACCENT, width=5)

    canvas.create_oval(cx-r2, cy-r2, cx+r2, cy+r2, outline=config.MUTED, width=2)

    canvas.create_text(cx, cy+50, text="SCANNING...", fill=config.ACCENT,
                       font=("Consolas", 10, "bold"))

    _angle = (_angle + 12) % 360
    canvas.after(40, animate_loader)
