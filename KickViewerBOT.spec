# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import os
import sys

# Try to get tls_client dependencies path
tls_client_binaries = []
try:
    import tls_client
    tls_client_deps = os.path.join(os.path.dirname(tls_client.__file__), 'dependencies')

    # Only add binaries that actually exist
    potential_binaries = [
        'tls-client-32.dll',
        'tls-client-64.dll',
        'tls-client-amd64.so',
        'tls-client-arm64.dylib',
        'tls-client-arm64.so',
        'tls-client-x86.dylib',
        'tls-client-x86.so',
    ]

    for binary in potential_binaries:
        binary_path = os.path.join(tls_client_deps, binary)
        if os.path.exists(binary_path):
            tls_client_binaries.append((binary_path, 'tls_client/dependencies'))
            print(f"Found tls_client binary: {binary}")

    # Also include the entire dependencies folder as data
    if os.path.exists(tls_client_deps):
        print(f"Adding tls_client dependencies folder: {tls_client_deps}")
except ImportError as e:
    print(f"Warning: Could not import tls_client: {e}")


# Use the current Python environment's site-packages (works for venv and CI)
import site
site_packages = site.getsitepackages()[0]

# Build data list - only include actual data files, not Python packages
datas = [
    ('backend', '.'),
]

# Add fake_useragent data files if they exist
fake_useragent_data = os.path.join(site_packages, 'fake_useragent', 'data')
if os.path.exists(fake_useragent_data):
    datas.append((fake_useragent_data, 'fake_useragent/data'))

# Add tls_client dependencies folder if it exists
try:
    import tls_client
    tls_client_deps_dir = os.path.join(os.path.dirname(tls_client.__file__), 'dependencies')
    if os.path.exists(tls_client_deps_dir):
        datas.append((tls_client_deps_dir, 'tls_client/dependencies'))
        print(f"Added tls_client dependencies to datas: {tls_client_deps_dir}")
except:
    pass

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
    uac_admin=True,
    icon='frontend/public/favicon.ico'
)