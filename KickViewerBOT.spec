# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

import os
from PyInstaller.utils.hooks import collect_data_files

datas = collect_data_files('imageio_ffmpeg')
if os.path.isfile('creator-oauth.json'):
    datas.append(('creator-oauth.json', '.'))

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'backend.creator.service',
        'backend.creator.accounts',
        'backend.creator.media',
        'backend.creator.automation',
        'backend.creator.store',
        'backend.creator.server_log',
        'imageio_ffmpeg',
        'keyring.backends.Windows',
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
        'typing_extensions',
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
