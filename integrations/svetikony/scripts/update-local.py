#!/usr/bin/env python3
"""Update the confirmed personal plugin source and reinstall through Codex CLI.
Uses plugin-creator validation/cachebuster flow; never edits marketplace/config.
"""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile

source = Path(__file__).resolve().parents[1]
helper = Path.home() / '.codex/skills/.system/plugin-creator/scripts'
marketplace = subprocess.check_output([sys.executable, str(helper/'read_marketplace_name.py')], text=True).strip()
manifest = json.loads((source/'.codex-plugin/plugin.json').read_text())
if manifest['name'] != 'svetikony':
    raise SystemExit('Unexpected plugin name')
listing = json.loads(subprocess.check_output(['codex', 'plugin', 'list', '--json'], text=True))
entry = next((p for p in listing['installed'] if p['pluginId'] == 'svetikony@'+marketplace), None)
destination = Path.home() / 'plugins/svetikony'
if not entry or entry.get('source', {}).get('source') != 'local' or Path(entry['source']['path']).resolve() != destination.resolve():
    raise SystemExit('Installed marketplace source does not match the personal plugin source')
subprocess.run([sys.executable, str(helper/'validate_plugin.py'), str(source)], check=True)
backup = Path(tempfile.mkdtemp(prefix='svetikony-plugin-backup-')) / 'svetikony'
shutil.copytree(destination, backup, ignore=shutil.ignore_patterns('node_modules', '*.sqlite*', '.state'))
# Manifest has been updated with the official cachebuster helper before this call.
if '+codex.' not in manifest['version']:
    raise SystemExit('Run update_plugin_cachebuster.py on the reviewed source first')
for name in ['.codex-plugin', '.mcp.json', 'skills', 'src', 'scripts', 'dist', 'tests', 'README.md', 'AI_ACCESS_STABILITY_REPORT.md', 'AI_DELEGATED_ACCESS_REPORT.md', 'VISUALIZER_PLUGIN_REPORT.md', 'TERRAIN_BUNDLE_REPORT.md', 'package.json', 'package-lock.json', '.gitignore']:
    src, dst = source/name, destination/name
    if src.is_dir():
        shutil.copytree(src, dst, dirs_exist_ok=True)
    elif src.is_file():
        shutil.copy2(src, dst)
subprocess.run([sys.executable, str(helper/'validate_plugin.py'), str(destination)], check=True)
subprocess.run(['codex', 'plugin', 'add', 'svetikony@'+marketplace], check=True)
print('Previous plugin backup:', backup)
print('Updated plugin source:', destination)
print('Start a new Codex thread to load the updated tools.')
