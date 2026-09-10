#!/usr/bin/env python3
"""Install this reviewed build into the default personal Codex marketplace.
No credentials are copied. Refuses to overwrite an existing plugin source.
"""
from pathlib import Path
import os
import shutil
import subprocess
import sys

source = Path(__file__).resolve().parents[1]
skill = Path.home() / '.codex/skills/.system/plugin-creator'
destination = Path.home() / 'plugins/svetikony'
marketplace = Path.home() / '.agents/plugins/marketplace.json'
if destination.exists():
    raise SystemExit('Plugin source already exists; use the plugin-creator update workflow.')
if marketplace.exists():
    subprocess.run([sys.executable, str(skill/'scripts/read_marketplace_name.py')], check=True)
subprocess.run([sys.executable, str(skill/'scripts/validate_plugin.py'), str(source)], check=True)
subprocess.run([sys.executable, str(skill/'scripts/create_basic_plugin.py'), 'svetikony', '--with-marketplace', '--with-skills', '--with-scripts', '--with-mcp'], check=True)
for name in ['.codex-plugin', '.mcp.json', 'skills', 'src', 'scripts', 'dist', 'README.md', 'package.json', 'package-lock.json', '.gitignore']:
    src, dst = source/name, destination/name
    if src.is_dir(): shutil.copytree(src, dst, dirs_exist_ok=True)
    else: shutil.copy2(src, dst)
subprocess.run([sys.executable, str(skill/'scripts/validate_plugin.py'), str(destination)], check=True)
name = subprocess.check_output([sys.executable, str(skill/'scripts/read_marketplace_name.py')], text=True).strip()
# The helper prints the validated name only; do not construct shell commands.
subprocess.run(['codex', 'plugin', 'add', 'svetikony@'+name], check=True)
print('Installed source:', destination)
print('Marketplace:', marketplace)
