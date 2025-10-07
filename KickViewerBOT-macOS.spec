# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import os
import sys

# Try to get tls_client dependencies path
try:
    import tls_client
    tls_client_deps = os.path.join(os.path.dirname(tls_client.__file__), 'dependencies')
    tls_client_binaries = [
        (os.path.join(tls_client_deps, 'tls-client-32.dll'), 'tls_client/dependencies'),
        (os.path.join(tls_client_deps, 'tls-client-64.dll'), 'tls_client/dependencies'),
        (os.path.join(tls_client_deps, 'tls-client-amd64.so'), 'tls_client/dependencies'),
        (os.path.join(tls_client_deps, 'tls-client-arm64.dylib'), 'tls_client/dependencies'),
        (os.path.join(tls_client_deps, 'tls-client-arm64.so'), 'tls_client/dependencies'),
        (os.path.join(tls_client_deps, 'tls-client-x86.dylib'), 'tls_client/dependencies'),
        (os.path.join(tls_client_deps, 'tls-client-x86.so'), 'tls_client/dependencies'),
    ]
except ImportError:
    tls_client_binaries = []

# Check if we're in a virtual environment
if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    # We're in a virtual environment
    if sys.platform == "win32":
        site_packages = os.path.join(sys.prefix, 'Lib', 'site-packages')
    else:
        site_packages = os.path.join(sys.prefix, 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
else:
    # We're not in a virtual environment, use default paths
    import site
    site_packages = site.getsitepackages()[0]

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=tls_client_binaries,
    datas=[
        ('backend', '.'),
        ('backend/.env', '.'),
        ('frontend/out', 'static'),
        (os.path.join(site_packages, 'fake_useragent', 'data'), 'fake_useragent/data'),
        (os.path.join(site_packages, 'fake_useragent'), 'fake_useragent'),
        (os.path.join(site_packages, 'streamlink'), 'streamlink'),
        (os.path.join(site_packages, 'websockets'), 'websockets'),
        (os.path.join(site_packages, 'tls_client'), 'tls_client'),
        (os.path.join(site_packages, 'cffi'), 'cffi'),
        (os.path.join(site_packages, 'psutil'), 'psutil'),
    ],
    hiddenimports=[
        'rich',
        'trio',
        'resource',
        'websockets',
        'tls_client',
        'tls_client.dependencies',
        'fake_useragent',
        'streamlink',
        'cffi',
        'psutil',
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