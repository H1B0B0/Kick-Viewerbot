# Creator Studio — release candidate 4.0.0-6

## Available offline

Import an owned MP4/MOV/MKV/WebM recording (up to 4 GB / 12 hours), select audio-peak candidates, render real 720×1280 H.264/AAC vertical MP4s, preview/download, edit titles and descriptions, import clip-relative WebVTT captions for the **local preview**, export the inventory, delete originals or clips. The full frame is preserved over a blurred background. This is an audio-energy heuristic, not semantic AI or a promise of audience growth. Silent videos fall back to spaced samples. Short videos can produce fewer clips than requested.

Jobs and results are stored in `creator-data/creator.sqlite` under the desktop app's local data directory. Native MP4/CSV exports are written to the operating system's Downloads folder with unique names, without overwriting existing files. Restarting marks unfinished jobs as interrupted and unfinished uploads as unknown: neither is silently retried. User video is not sent to a platform during local processing. No synthetic audience action is enabled by the V4 backend.

## Automatic recording clips

In the desktop app, choose an OBS/local recording folder, select clip count/duration, then click **Start watching**. Only new MP4/MOV/MKV/WebM files directly inside that folder are consumed; existing recordings are skipped on first selection, subfolders and symlinks are not followed. Files must remain unchanged for 20 seconds before inspection and managed-copy import. This stability check is a heuristic, not an OS guarantee that a recorder has closed a file: prefer finalized recordings or move them into the watched folder after recording. New recordings queue real audio-peak/vertical rendering automatically. Originals remain untouched. A persistent fingerprint prevents reimport of the same unchanged recording across restarts. Changed files are treated as new versions. The enabled folder setting persists; app logout pauses watching, and the app must be open to process files. Failures are visible, not reported as completed clips. No automatic publication is performed.

This works with recordings you own from Kick, Twitch or YouTube without scraping, proxy playback, video relay or a platform login. Browser mode retains manual import; the OS-folder selector and watcher setup belong to the desktop app.

## Platform setup required before a connected beta

The publisher configures these clients once; ordinary users must not create developer applications.

1. Register a **Public** Twitch application. Use its public Client ID with Device Code Flow. The connector requests `clips:edit`, validates token ownership/scopes, refreshes tokens, and uses official Helix endpoints on the authenticated user's channel. No client secret is shipped. Device authorization works in any default browser; it does not require a Chrome callback.
2. Create a Google Cloud project, enable **YouTube Data API v3**, configure the consent screen and test users, then create an OAuth client of type **Desktop app**. The installed-client credentials are not a confidential server secret; never substitute a Web-client/server secret. Google uses a loopback callback and PKCE. Review Google's verification, quotas and upload audit restrictions before advertising public uploads to the community. Unverified API projects may only upload private videos; the app displays the returned visibility, not the requested visibility.
3. The normal product setup is now **VelBots API**: deploy its new authenticated `GET /creator/desktop-config` route and set `CREATOR_TWITCH_PUBLIC_CLIENT_ID`, `CREATOR_GOOGLE_DESKTOP_CLIENT_ID` and, where required, `CREATOR_GOOGLE_DESKTOP_CLIENT_SECRET` for the explicitly **installed desktop** client. See the API repository's `CREATOR_SETUP.md`. Never substitute a confidential Web/server client secret. The app retrieves this configuration with its existing authenticated VelBots session and applies only the protocol's native/public fields to the nonce-protected local service. Click **Refresh connections** to retry after an API/configuration update. Missing/deployed-old API responses are displayed as unavailable, not connected. User tokens stay in the OS keychain, scoped by VelBots account, provider and client ID. No user access/refresh tokens or Patreon secret are returned by the configuration endpoint.
4. For publisher-only offline development, `creator-oauth.json` and `<app-local-data>/creator-data/oauth-config.json` remain available, with `VELBOTS_TWITCH_CLIENT_ID`, `VELBOTS_GOOGLE_CLIENT_ID`, `VELBOTS_GOOGLE_CLIENT_SECRET` overrides. This specific bundled file is deliberate; `backend/.env` and the backend directory are **not** copied as data. Never place user access/refresh tokens in these files. Ordinary users should not enter developer credentials.
5. Authorize real Twitch/YouTube accounts, test consent denial, renewal, disconnect, account switching, live detection, official clip confirmation, one private upload and statistics retrieval. Mocked HTTP tests do not replace this account-level acceptance. This implementation does not deploy the API, register developer applications or grant authorization.

The Twitch live automation is opt-in and runs only while VelBots is open: a 30% increase and at least 10 additional viewers between checks, with a 20-minute cooldown. It creates official platform clips; it does not record a stream or relay video. Live statistics have their actual source and fetch time. Clip processing delays are shown as pending, not success; pending clip receipts are reconciled during later live refreshes. Logout locks the provider context and stops automation without destroying saved keychain credentials. A queued YouTube upload cannot silently switch to another account after approval.

YouTube publishing requires explicit clip approval, an audience selection, visibility and optional future schedule. An unknown upload outcome prevents automatic duplicate submission: inspect YouTube Studio before further action. The current connector streams a single resumable upload body; it does **not** resume a transfer across app restarts. Imported WebVTT captions are currently local-preview only, not uploaded or burned into the MP4.

Kick compatibility currently means **local processing of owned Kick recordings**, not an authenticated Kick integration, direct clip creation or publishing. A verified official API/backend OAuth arrangement is still needed for any additional promise.

Official references: [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [Twitch clips](https://dev.twitch.tv/docs/api/clips/), [Google desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [YouTube videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert).

## Validation commands

```sh
.venv/bin/python -m pytest -q
cd frontend
npm run typecheck
npm run test:unit -- --run
npm run lint:check
```

For the actual-browser test, run the backend in `--dev` on port 8765 and Next on port 3002, then run `VELBOTS_CREATOR_E2E=1 npx playwright test tests/e2e/creator-studio.spec.ts --project=chromium --workers=1`. Only the remote paid-login identity is stubbed; media processing, requests, video playback and download use the real local backend. It uses the bundled encoder from the project's Python environment; `VELBOTS_E2E_FFMPEG` or `VELBOTS_E2E_PYTHON` can override the paths.

## Distribution gates still open

### Recorded local acceptance — 2026-10-06

The packaged macOS beta 5 was opened and the user signed in to the existing account. In that authenticated native session, a synthetic six-second test recording was imported, processed into a real clip, played in the native WebView and exported through the native Downloads command. The exported file was inspected: 720×1280 H.264, 30 fps, AAC, six seconds. The native CSV export was also inspected and contained the generated clip. Nothing was published to a platform. This confirms that local workflow with the packaged sidecar; it does not establish the login method, a complete Patreon OAuth acceptance, Windows behavior or real platform publishing.

Backend tests: 39 passed. Frontend unit tests: 30 passed. Rust library tests: 3 passed. Type checking passed. The packaged-sidecar smoke test exercised import, actual encoding, signed media, captions and deletion of its temporary test source. Lint passed with existing warnings. These checks do not close the distribution gates below.

Beta 6 acceptance on the same date: the user session survived relaunch. In the actual native app, the OS folder picker selected an isolated test folder, watching was explicitly enabled, and a synthetic MP4 was subsequently copied into that folder. The app imported it and generated a second playable clip without clicking manual import or invoking a job from the UI. The new clip was played and exported to Downloads; the exported file was inspected successfully. Watching of the test folder was then stopped. The packaged-sidecar smoke test also covered automatic folder import/rendering without publication. Platform settings were correctly displayed as unavailable against the not-yet-updated live VelBots API; no real provider authorization or publication was attempted.

Beta 6 checks: 48 backend tests, 32 frontend unit tests and 18 VelBots API tests passed; frontend type checking and the five-language real-browser video/download test passed. VelBots API compiled. Its configuration endpoint was tested using the actual JWT guard/strategy (missing, invalid, expired and unknown-user tokens rejected), with an isolated test user service instead of a real production database. The macOS app bundle compiled with updater-artifact generation disabled for local acceptance only. Provider queries/tokens are not printed in configuration logs, and local access logs redact OAuth/media URL query parameters while retaining request/status monitoring.

- Real-account OAuth/platform acceptance needs the developer applications above. Patreon remote-server validation is a separate acceptance step; this change preserves the existing login but does not establish that the deployed Patreon service works.
- Windows packaged acceptance must run on Windows; macOS acceptance does not prove it.
- Updater artifacts need the existing `TAURI_SIGNING_PRIVATE_KEY` supplied securely; never replace the pinned public key just to bypass signing. An unsigned local `.app` is not a signed release.
- FFmpeg bundled by imageio-ffmpeg is a separate GPL executable. Before public redistribution, include the complete applicable license, copyright notices and corresponding-source distribution/offer for the exact platform binaries. Check all transitive license obligations. See [FFmpeg legal](https://ffmpeg.org/legal.html). Local functional builds alone do not close this distribution gate.

Do not label this candidate as a production-ready, fully automated cross-platform growth product while these gates remain open.
