#!/usr/bin/env python3
"""Run `npm run build` for the site while holding an exclusive lock, so parallel agents never build into dist/ at the same time.
Usage: python3 scripts/build_locked.py   (from anywhere). Exit code = the build's exit code. Prints the build's last 15 lines."""
import fcntl, os, subprocess, sys
site = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(site, '.build.lock'), 'w') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    r = subprocess.run(['npm', 'run', 'build'], cwd=site, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().splitlines()
    print('\n'.join(out[-15:]))
    sys.exit(r.returncode)
