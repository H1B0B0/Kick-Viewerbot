import subprocess
import time
from pathlib import Path

import pytest

from backend.creator.automation import RecordingAutomation
from backend.creator.accounts import AccountError, Accounts, TokenVault
from backend.creator.media import MediaError, executable
from backend.creator.service import CreatorService
from backend.creator.server_log import SafeWebSocketHandler
from tests.backend.test_creator_studio import Vault, client, service, accounts, headers


def config(owner='owner', twitch='publictwitchclient'):
    return {'protocol_version': 1, 'account_id': owner, 'twitch': {'kind': 'public', 'client_id': twitch},
            'youtube': {'kind': 'desktop', 'client_id': '123-desktop.apps.googleusercontent.com', 'client_secret': 'installed-test'}}


def test_local_access_log_preserves_monitoring_without_oauth_or_media_secrets():
    handler = object.__new__(SafeWebSocketHandler)
    handler.requestline = 'GET /creator/oauth/youtube/callback?code=private-code&state=private-state HTTP/1.1'
    original = handler.requestline
    handler.response_length = 40
    handler.time_finish = None
    handler.client_address = ('127.0.0.1', 8765)
    handler._orig_status = '200 OK'
    message = handler.format_request()
    assert 'GET /creator/oauth/youtube/callback HTTP/1.1' in message and '200' in message
    assert 'private-code' not in message and 'private-state' not in message
    assert handler.requestline == original


def test_provider_configuration_contract_and_nonce(client, accounts):
    assert client.post('/creator/accounts/configure', json=config()).status_code == 401
    result = client.post('/creator/accounts/configure', headers=headers, json=config())
    assert result.status_code == 200
    assert all(item['configured'] for item in result.json['accounts'][:2])
    assert 'installed-test' not in str(client.get('/creator/workspace', headers=headers).json)
    accounts.pending['youtube'] = {'state': 'pending'}
    assert accounts.configure(config()) is False
    assert 'youtube' in accounts.pending
    assert accounts.configure(config('another-owner')) is True
    assert not accounts.pending
    malformed = config()
    malformed['youtube']['kind'] = 'web'
    assert client.post('/creator/accounts/configure', headers=headers, json=malformed).status_code == 400
    assert accounts.account_id == 'another-owner'
    assert client.post('/creator/accounts/lock', headers=headers).json['locked'] is True
    assert accounts.config == {} and accounts.account_id is None


def test_account_switch_does_not_upload_to_the_next_account(accounts, tmp_path):
    accounts.configure(config())
    generation = accounts.generation
    accounts.configure(config('another-owner'))
    with pytest.raises(AccountError, match='account_changed_before_upload'):
        accounts.upload_youtube(tmp_path / 'clip.mp4', 'Title', '', expected_generation=generation)


def test_late_twitch_clip_confirmation_is_reconciled(service, monkeypatch):
    accounts = service.accounts
    accounts.account_id = 'owner'
    pending = service.store.create('official_clip', platform_id='pending-clip', confirmed=False, creator_owner='owner')
    foreign = service.store.create('official_clip', platform_id='foreign-clip', confirmed=False, creator_owner='another-owner')
    monkeypatch.setattr(accounts, 'twitch_clip', lambda clip_id: {'id': clip_id, 'url': 'https://clips.twitch.tv/confirmed', 'title': 'Verified'})
    service.reconcile_twitch_clips()
    assert service.store.get(pending['id'])['confirmed'] is True
    assert service.store.get(foreign['id'])['confirmed'] is False


def test_keychain_is_scoped_to_velbots_account_and_client():
    vault = TokenVault()
    class Keyring:
        values = {}
        def get_password(self, service, key): return self.values.get((service, key))
        def set_password(self, service, key, value): self.values[(service, key)] = value
        def delete_password(self, service, key): self.values.pop((service, key))
    vault.keyring = Keyring()
    settings = {'twitch_client_id': 'publictwitchclient', 'google_client_id': '123-desktop.apps.googleusercontent.com'}
    vault.configure_scope('owner-one', settings)
    vault.set('twitch', {'access_token': 'private-test'})
    vault.configure_scope('owner-two', settings)
    assert vault.get('twitch') is None
    vault.configure_scope('owner-one', settings)
    assert vault.get('twitch')['access_token'] == 'private-test'
    vault.configure_scope('owner-one', {**settings, 'twitch_client_id': 'changedclient'})
    assert vault.get('twitch') is None


def test_recording_watcher_stability_deduplication_and_restart(tmp_path, monkeypatch):
    now = [0]
    folder = tmp_path / 'OBS'
    folder.mkdir()
    existing = folder / 'old.mp4'
    existing.write_bytes(b'existing')
    service = CreatorService(tmp_path / 'data', accounts=Accounts(tmp_path, vault=Vault(), config={}))
    watcher = RecordingAutomation(service, settle_seconds=20, clock=lambda: now[0])
    watcher.configure(str(folder), True, count=2, length=15)
    queued = []
    monkeypatch.setattr('backend.creator.automation.inspect_video', lambda file: 60)
    monkeypatch.setattr(service, 'queue', lambda *values: queued.append(values))
    watcher.scan()
    assert not queued
    new = folder / 'new.mp4'
    new.write_bytes(b'new recording')
    watcher.scan()
    now[0] += 10
    new.write_bytes(b'new recording continued')
    watcher.scan()
    now[0] += 19
    watcher.scan()
    assert not queued
    now[0] += 1
    watcher.scan()
    assert len(queued) == 1 and queued[0][1:] == (2, 15)
    assert new.read_bytes() == b'new recording continued'
    watcher.scan()
    restarted = RecordingAutomation(service, settle_seconds=0)
    restarted.scan()
    restarted.scan()
    assert len(queued) == 1
    assert restarted.settings['enabled'] is True
    assert len(service.store.list('source')) == 1
    assert service.store.list('source')[0]['automatic'] is True
    watcher.configure(str(folder), False)
    (folder / 'paused.mp4').write_bytes(b'paused')
    now[0] += 30
    watcher.scan()
    assert len(queued) == 1


def test_watcher_rejects_broad_missing_folders_and_ignores_symlinks(service, tmp_path):
    watcher = service.recording_automation
    for folder in ('/', str(Path.home()), 'relative/path', str(tmp_path / 'missing')):
        with pytest.raises(MediaError, match='recording_folder_unavailable'):
            watcher.configure(folder, True)
    folder = tmp_path / 'OBS'
    folder.mkdir()
    outside = tmp_path / 'outside.mp4'
    outside.write_bytes(b'outside')
    (folder / 'linked.mp4').symlink_to(outside)
    watcher.configure(str(folder), True)
    watcher.scan()
    assert service.store.list('source') == []


def test_watching_can_be_stopped_even_when_the_folder_disappears(service, tmp_path):
    folder = tmp_path / 'OBS'
    folder.mkdir()
    watcher = service.recording_automation
    watcher.configure(str(folder), True)
    folder.rmdir()
    watcher.scan()
    assert watcher.snapshot()['error'] == 'recording_folder_unavailable'
    assert watcher.configure('', False)['enabled'] is False
    assert watcher.snapshot()['error'] is None


def test_watcher_automatically_creates_real_vertical_clip(service, tmp_path):
    folder = tmp_path / 'OBS'
    folder.mkdir()
    watcher = RecordingAutomation(service, settle_seconds=0)
    watcher.configure(str(folder), True, count=1, length=5)
    video = folder / 'finished-live.mp4'
    subprocess.run([executable(), '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=15', '-t', '6', '-c:v', 'libx264', str(video)], check=True, timeout=30)
    watcher.scan()
    watcher.scan()
    deadline = time.monotonic() + 40
    while time.monotonic() < deadline:
        jobs = service.store.list('job')
        if jobs and jobs[0]['state'] not in {'queued', 'analyzing', 'rendering'}: break
        time.sleep(.1)
    assert jobs[0]['state'] == 'ready', jobs
    assert len(service.store.list('clip')) == 1
    assert service.store.list('clip')[0]['publication']['state'] == 'unpublished'
    assert video.exists()
    watcher.scan()
    assert len(service.store.list('job')) == 1
