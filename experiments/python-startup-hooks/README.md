# Python startup hooks

Evidence for the article [What Runs Before Your First Line of Python](https://www.mehdi.cz/blog/what-runs-before-your-first-line-of-python).

The article looks at code that runs at Python interpreter startup: `.pth` files
with an `import` line, `sitecustomize.py`, and the new `.start` entry points
from PEP 829. It also measures the startup effect of PEP 810 explicit lazy
imports on Python 3.15. Nothing here downloads, installs or runs the
compromised package discussed in the news. Everything is built by hand from
harmless parts.

## What each piece is

| Path | What it is |
| --- | --- |
| `make_wheels.py` | Builds two tiny wheels by hand (a wheel is a zip): `startlog`, a harmless startup hook, and `tinydep`, a package to install in the demo. |
| `startlog` (built) | A module plus `startlog.pth` whose single line is `import startlog`. The module appends one line (pid, executable, argv) to the file named by `STARTLOG_FILE`, and nothing if that variable is unset. It writes only inside `out/`. |
| `splitpkg/` | A package whose built wheel contains a folder (`demoproj_extra`) that its sdist does not. Two settings in `pyproject.toml` make it: `[tool.hatch.build.targets.wheel.force-include]` copies `extra/` into the wheel, and `[tool.hatch.build.targets.sdist]` limits the sdist to `src` and `pyproject.toml`. Without the second setting, hatchling puts `extra/marker.py` in the sdist too. The wheel cannot be built from this sdist: a plain `uv build` (wheel from sdist) fails with `Forced include not found`, so `run.sh` builds the sdist and the wheel separately from the source tree. This reproduces the observable asymmetry of the news case (the sdist does not show what the wheel installs), not the attacker's exact method. |
| `scan_pth.py` | Read-only. Lists every `.pth` file with an executable `import` line (leading spaces allowed, as Python 3.15 strips them), plus any `.start`, `sitecustomize` or `usercustomize`, in the system Python's site-packages and the user site-packages. Home paths are replaced with `DIR`. On a pacman system, `run.sh` also prints the package that owns each system `.pth` file. |
| `lazy/app_eager.py`, `lazy/app_lazy.py` | A small CLI-like script that imports several standard-library modules but uses none of them for `--version`. The lazy variant marks the same imports with the `lazy` keyword (Python 3.15); `argparse` stays eager in both. |
| `modules.py` | Counts, for each variant, the `-X importtime` lines and the modules really initialised (lines `import '...'` of `python -v`). Some importtime lines are failed lookups (Windows modules such as `nt`, and the absent `sitecustomize` and `usercustomize`); the script lists them. It also lists the modules the eager script initialises and the lazy one skips, and checks that a full run initialises the same modules in both. |
| `bench.py` | Interleaved wall-clock timing of the `--version` path: eager, lazy keyword, and `-X lazy_imports=all`, all with the same interpreter as `modules.py`. 5 warmup runs, then 40 rounds of the three variants. Prints median, quartiles, min and max, a paired comparison per round, and the raw samples. Before and after, it saves `uptime`, `top -bn1` (first 15 lines) and `free -m`; the COMMAND column of `top` is replaced by `(hidden)` so that no program names are committed. |
| `run.sh` | Rebuilds every file in `results/`. |

## What each step shows

- `startup`: five ordinary commands each run the hook once; then which interpreter flags skip it (only `-S`).
- `where`: `strace` shows `startlog.pth` opened at startup. In a Python 3.14 virtualenv it is opened twice, because `site.venv()` and `site.main()` both call `addsitepackages` and `addsitedir` reads `.pth` files on every call. A `.pth` line with a direct side effect (`side.pth`, created and removed by the step) runs twice per start on 3.14 and once on 3.15.1. The `startlog` module writes once on both, since the second `import` finds it loaded. The step also saves the relevant `site.py` lines of Python 3.14 with their line numbers.
- `sitecustomize`: a `sitecustomize.py` runs at every start; only `-S` skips it.
- `split`: the sdist and wheel contents, the two settings, the default-sdist variant, and the failed wheel-from-sdist build.
- `scan`: the read-only inventory of the laptop.
- `lazy`: module counts (`results/lazy-modules.txt`) and timing (`results/lazy-timing.txt`).
- `pep829`: a `.start` entry point on Python 3.15. The named module's top-level code runs first, then the function, so a `.start` file still runs code at every start. Also the deprecation message for `.pth` import lines (only with `-v`) and the suppression by a matching `.start` file.

## The `startlog` hook is harmless on purpose

`startlog.py` runs at interpreter startup because `startlog.pth` contains
`import startlog`, and the `site` module executes `.pth` lines that begin with
`import`. The module only records that Python started. It writes a single line
to the path in `STARTLOG_FILE` and never anywhere else, and it does nothing when
that variable is unset. It is installed only into throwaway virtualenvs under
`out/`, never into a real Python. The same holds for `side.pth`, `sitecustomize.py`
and `startmark.py`/`startmark.start`, which the steps create inside those
virtualenvs and remove afterwards.

## How to run

```sh
sh run.sh            # all steps
sh run.sh lazy       # one step: deps wheels venvs startup where
                     # sitecustomize split scan lazy pep829
```

`run.sh` writes build products and virtualenvs into `out/` (git-ignored) and the
quoted outputs into `results/`. It downloads the `uv` wheel from PyPI (version
and SHA-256 pinned at the top of `run.sh`; override with `UV_URL` and
`UV_SHA256`). `uv` then downloads CPython 3.15 from python-build-standalone into
`out/python`, and fetches the hatchling build backend from PyPI for `splitpkg`.
Python 3.14 is the system interpreter at `/usr/bin/python3.14` (override with
`PY314`). `STORY_LOCK` names a lock file that the heavy steps take with `flock`.
The timing runs are pinned with `taskset` to the CPU in `BENCH_CPU` (default 2,
a performance core on the laptop used here).

## Tool versions used for the committed results

- `uv` 0.13.5
- System Python 3.14.3 (`/usr/bin/python3.14`), with python-setuptools 82.0.0 from the distribution
- Downloaded Python 3.15.1 (`main`, Oct 21 2026), from python-build-standalone
- `pip` 26.2.2 (seeded by uv into the virtualenvs)
- `hatchling` 1.32.4 (fetched by uv for `splitpkg`, recorded in `results/wheel-vs-sdist.txt`)
- `strace` 6.19, `unzip` 6.00, GNU `tar` 1.35, `taskset` from util-linux, on Manjaro Linux, kernel 6.6.126
- 12th Gen Intel Core i7-1260P (CPUs 0-7 are performance-core threads, 8-15 efficiency cores)

Timing numbers move from run to run and depend on how busy the laptop is. The
committed run had a load average near 2.5 and a full swap; `results/lazy-timing.txt`
records the machine state before and after. The module counts and the
wheel-versus-sdist contents do not move.
