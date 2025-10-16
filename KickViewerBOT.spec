# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import os
import sys

# Note: tls_client binaries are now handled by hooks/hook-tls_client.py
tls_client_binaries = []


# Use the current Python environment's site-packages (works for venv and CI)
import site
site_packages = site.getsitepackages()[0]

# Build data list - only include actual data files, not Python packages
datas = [
    ('backend', '.'),
]

# Add fake_useragent data files manually (hooks don't always catch data files)
try:
    import fake_useragent
    fake_useragent_base = os.path.dirname(fake_useragent.__file__)
    fake_useragent_data = os.path.join(fake_useragent_base, 'data')

    if os.path.exists(fake_useragent_data):
        # Add the entire data directory with its contents
        datas.append((fake_useragent_data, 'fake_useragent/data'))
        print(f"[OK] Added fake_useragent data: {fake_useragent_data}")

    # Also add py.typed if it exists
    py_typed = os.path.join(fake_useragent_base, 'py.typed')
    if os.path.exists(py_typed):
        datas.append((py_typed, 'fake_useragent'))

except Exception as e:
    print(f"[WARNING] Could not add fake_useragent data: {e}")

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=tls_client_binaries,
    datas=datas,
    hiddenimports=[
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
        # fake_useragent and its submodules
        'fake_useragent',
        'fake_useragent.data',
        'fake_useragent.utils',
        'fake_useragent.fake',
        'fake_useragent.errors',
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
    hookspath=['hooks'],
    hooksconfig={},
    runtime_hooks=['hooks/runtime-hook-fake_useragent.py'],
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
    uac_admin=False,
    icon='frontend/public/favicon.ico'
)