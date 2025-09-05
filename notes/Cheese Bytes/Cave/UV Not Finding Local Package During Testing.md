When using [[Python UV]] for running tests using the command: `uv run pytest` I
was getting a `ModuleNotFoundError: No module named '<my-package-here>'`. The
solution was to add a `__init__.py` file to the `tests` dir.

For more info: https://github.com/astral-sh/uv/issues/7260

It's a bit weird because `uv run python -c "import <my-package-here>"` was also
failing without that `__init__.py` file. It is working now... so not sure how
that test file affects a simple import.
