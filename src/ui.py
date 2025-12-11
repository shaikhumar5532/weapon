import tkinter as tk
from . import config
from . import context
from . import utils
from . import detection


def build_ui():
    root = tk.Tk()
    context.root = root
    root.title("MATRIX // WEAPON-DETECTION NODE // YOLOv8")
    try:
        root.state("zoomed")
    except Exception:
        pass
    root.configure(bg=config.BG)

    # --- Header ---
    header = tk.Frame(root, bg=config.BG)
    header.pack(fill="x", pady=10, padx=15)

    tk.Label(header, text="MATRIX WEAPON DETECTION CONSOLE",
             fg=config.ACCENT, bg=config.BG, font=("Consolas", 20, "bold")).pack(side="left")

    tk.Label(header, text="ENGINE: YOLOv8   NODE: ACTIVE",
             fg=config.MUTED, bg=config.BG, font=("Consolas", 10)).pack(side="left", padx=20)

    tk.Frame(root, bg=config.ACCENT, height=2).pack(fill="x", padx=15, pady=10)

    main = tk.Frame(root, bg=config.BG)
    main.pack(fill="both", expand=True, padx=15, pady=10)

    sidebar = tk.Frame(main, bg=config.SIDEBAR_BG, width=330)
    sidebar.pack(side="left", fill="y")
    sidebar.pack_propagate(False)

    tk.Label(sidebar, text="> CONTROL PANEL", fg=config.ACCENT,
             bg=config.SIDEBAR_BG, font=("Consolas", 14, "bold")).pack(anchor="w", padx=20, pady=15)

    btn_box = tk.Frame(sidebar, bg=config.SIDEBAR_BG)
    btn_box.pack(fill="x", padx=20, pady=10)


    def make_btn(name, cmd):
        b = tk.Button(btn_box, text=name, command=cmd,
                      fg=config.TEXT, bg=config.BTN_BG, bd=0, relief="flat",
                      font=("Consolas", 11), pady=7)
        b.pack(fill="x", pady=6)
        b.bind("<Enter>", utils.on_enter)
        b.bind("<Leave>", utils.on_leave)
        return b


    make_btn("▣ IMAGE SCAN", detection.detect_image)
    make_btn("▣ VIDEO SCAN", detection.detect_video)
    make_btn("▣ LIVE WEBCAM", detection.start_webcam)
    make_btn("✘ STOP ALL FEEDS", detection.stop_all_func)

    tk.Label(sidebar, text="\n> SYSTEM LOG", fg=config.ACCENT,
             bg=config.SIDEBAR_BG, font=("Consolas", 12, "bold")).pack(anchor="w", padx=20)

    log_frame = tk.Frame(sidebar, bg=config.SIDEBAR_BG)
    log_frame.pack(fill="both", expand=True, padx=15, pady=10)

    context.log_text = tk.Text(log_frame, bg="#000000", fg=config.ACCENT,
                                font=("Consolas", 9), relief="flat", wrap="word")
    context.log_text.pack(fill="both", expand=True)
    context.log_text.config(state="disabled")

    utils.log("BOOT: MATRIX Online.")
    utils.log("YOLOv8 Node Initialized.")
    utils.log("Awaiting Commands...")

    content = tk.Frame(main, bg=config.BG)
    content.pack(side="left", fill="both", expand=True)

    preview_outer = tk.Frame(content, bg=config.ACCENT_SOFT)
    preview_outer.pack(pady=10)

    preview_inner = tk.Frame(preview_outer, bg=config.PANEL_BG)
    preview_inner.pack(padx=3, pady=3)

    context.panel = tk.Label(preview_inner, bg=config.PANEL_BG, width=800, height=500)
    context.panel.pack()

    status_frame = tk.Frame(content, bg=config.BG)
    status_frame.pack(fill="x")

    context.status_label = tk.Label(status_frame, text="STATUS: IDLE",
                                    fg=config.ACCENT, bg=config.BG, font=("Consolas", 12, "bold"))
    context.status_label.pack(fill="x")

    context.detail_label = tk.Label(status_frame, text="DETAIL: Waiting for command...",
                                    fg=config.MUTED, bg=config.BG, font=("Consolas", 9))
    context.detail_label.pack(fill="x")

    credit_label = tk.Label(status_frame,
                            text="Made with ❤️by Umar Team",
                            fg=config.ACCENT,
                            bg=config.BG,
                            font=("Consolas", 10, "bold"))
    credit_label.pack(fill="x", pady=3)

    return root


def run():
    root = build_ui()
    root.mainloop()
