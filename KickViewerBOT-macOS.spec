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

# Use the current Python environment's site-packages (works for venv and CI)
import site
site_packages = site.getsitepackages()[0]

# Build data list with existence checks
datas = [
    ('backend', '.'),
]

# Add site-packages dependencies with existence checks
dependencies = [
    ('fake_useragent', 'fake_useragent'),
    ('streamlink', 'streamlink'),
    ('websockets', 'websockets'),
    ('tls_client', 'tls_client'),
    ('cffi', 'cffi'),
    ('psutil', 'psutil'),
]

for dep, target in dependencies:
    dep_path = os.path.join(site_packages, dep)
    if os.path.exists(dep_path):
        datas.append((dep_path, target))

# Add fake_useragent data files if they exist
fake_useragent_data = os.path.join(site_packages, 'fake_useragent', 'data')
fake_useragent_json = os.path.join(site_packages, 'fake_useragent', 'data.json')

if os.path.exists(fake_useragent_data):
    datas.append((fake_useragent_data, 'fake_useragent/data'))
if os.path.exists(fake_useragent_json):
    datas.append((fake_useragent_json, 'fake_useragent/data.json'))

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=tls_client_binaries,
    datas=datas,
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