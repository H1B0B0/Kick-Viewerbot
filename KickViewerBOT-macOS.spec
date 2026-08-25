# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

# Use the current Python environment's site-packages (works for venv and CI)
import site
site_packages = site.getsitepackages()[0]

# Build data list - only include actual data files, not Python packages
datas = [
    ('backend', 'backend'),
]

# Add fake_useragent data files if they exist
fake_useragent_data = os.path.join(site_packages, 'fake_useragent', 'data')
if os.path.exists(fake_useragent_data):
    datas.append((fake_useragent_data, 'fake_useragent/data'))

# Force include tls_client dependencies as binaries
tls_client_binaries = []
tls_client_deps = os.path.join(site_packages, 'tls_client', 'dependencies')
if os.path.exists(tls_client_deps):
    for f in os.listdir(tls_client_deps):
        if f.endswith(('.dll', '.so', '.dylib')):
            tls_client_binaries.append((os.path.join(tls_client_deps, f), 'tls_client/dependencies'))

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=tls_client_binaries,
    datas=datas,
    hiddenimports=[
        'backend.api.viewer_bot',
        'backend.api.viewer_bot_stability',
        # Flask and related
        'flask',
        'flask_cors',
        'flask_socketio',
        'socketio',
        'werkzeug',
        'gevent',
        'gevent.socket',
        'gevent.select',
        'gevent._socket3',
        'gevent.resolver.thread',
        'gevent.resolver.ares',
        'gevent.resolver.blocking',
        'gevent.event',
        'gevent.queue',
        'dns',
        'dns.dnssec',
        'dns.e164',
        'dns.hash',
        'dns.namedict',
        'dns.tsigkeyring',
        'dns.update',
        'dns.version',
        'dns.zone',
        # Network and HTTP
        'requests',
        'urllib3',
        'certifi',
        'charset_normalizer',
        'idna',
        # Websockets
        'websockets',
        'websockets.legacy',
        'websockets.legacy.client',
        'websockets.legacy.server',
        # Streaming
        'streamlink',
        'streamlink.plugins',
        'fake_useragent',
        # TLS Client
        'tls_client',
        'tls_client.dependencies',
        # UI
        'rich',
        'rich.console',
        'rich.progress',
        'rich.table',
        # Monitoring
        'psutil',
        # Other
        'cffi',
        'engineio',
        'engineio.async_drivers',
        'engineio.async_drivers.gevent',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
    noarchive=False,
)

# Collect all submodules and data
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='KickViewerBOT',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='frontend/public/favicon.ico'
)
