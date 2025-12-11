"""Launcher for the refactored UI/detection modules.

This file intentionally contains minimal code. The implementation
is split into the `app_core` package to improve maintainability
without changing behavior or UI.
"""

from src import ui


def main():
    ui.run()


if __name__ == "__main__":
    main()
