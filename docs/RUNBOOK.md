# Clutch: runbook

How to run it, deploy it, and what to do if the demo breaks. Commands marked *(after T0)* exist once the first build task has created the app.

## 1. Accounts and keys

Everything goes in `.env.local` on the laptop and in Vercel's project settings. Names are in `.env.example`. **Never paste a key into a chat, a commit, an issue or a screenshot.**

| Needed for | What | Where to get it |
|---|---|---|
| Tier 1 pre-generated cards | One LLM API key | Google AI Studio (Gemini), or Groq, or Anthropic. One is enough |
| Tier 2 rooms | A Supabase project: URL, anon (publishable) key, service-role key | supabase.com → new project → Settings → API |
| Tier 2 rooms | Anonymous sign-ins switched on | Supabase → Authentication → Sign In / Providers → Anonymous |
| Deploy | A Vercel account linked to the GitHub repo | vercel.com |
| Agent tools | `SUPABASE_PROJECT_REF` in your shell for the Supabase MCP server | The project's reference id |

Tier 1 runs with **no keys at all**: cards fall back to templates.

For LLM-written cards, put these three lines in `.env.local` (create it by copying `.env.example`), then run `npm run pregen` and `npm run evals:check`:

```
LLM_PROVIDER=gemini
LLM_MODEL=<a current Gemini model id from AI Studio>
LLM_API_KEY=<your key>
```

Only `gemini` and `none` are built. `groq` and `anthropic` are named in the design and fall back to templates.

## 2. Free-tier limits (checked 13 Nov 2026)

| Service | Limit on the free plan | What it means here |
|---|---|---|
| Supabase Realtime | 200 concurrent connections; 100 messages per second; 100 channel joins per second; 10 presence keys per object; 20 presence messages per second; 256 KB broadcast payload; 2 million messages a month | A room of friends is far below this. Reactions are rate-limited per person anyway |
| Supabase project | 500 MB database; 2 active projects; **the project pauses after 1 week without activity** | Open the dashboard and un-pause before any demo. See section 6 |
| Web push and notifications | iPhone: iOS 16.4 or later, only when the app is added to the Home Screen, manifest `display` must be `standalone`, and permission must be asked from a tap. Android and desktop Chrome, Edge, Firefox: work in a normal tab | Tier 1 notifications need the page open. The Focus screen tells iPhone users to add to Home Screen |
| Web vibration | Not supported on iPhone browsers | The notification is the only signal there |
| LLM | Gemini has a free tier; its per-model limits are shown per project inside AI Studio and **could not be confirmed from the public docs**. Groq's free-plan numbers were also not readable from its docs page | Check the limit in your own dashboard before running `pregen-cards`. The script sleeps between calls and can resume. About 250 calls are needed once |
| Vercel Hobby | Not re-checked for this project. Cron jobs on Hobby run at most once a day | No cron is used. The clock needs no server job |

## 3. Run locally *(after T0)*

Once per clone, switch on the commit guard (it blocks env files and anything that looks like a key):

```bash
git config core.hooksPath .githooks
```

```bash
npm install
```
```bash
cp .env.example .env.local
```
```bash
npm run dev
```

Open http://localhost:3000. To open it on a phone on the same Wi-Fi: put `DEV_LAN_HOST=<the laptop's Wi-Fi address>` in `.env.local`, start with `npm run dev -- -H 0.0.0.0`, and open `http://<that address>:3000` on the phone. Notifications and the service worker need HTTPS, so on the phone the Pulse, cards and shelf work but call-back notifications do not; test those on the laptop or the deployed link.

If a style change does not show up in `npm run dev`, restart it: the dev server has served a stale stylesheet after edits to `app/globals.css`.

Checks:

```bash
npm run typecheck && npm run lint && npm test
```
```bash
npm run e2e
```
```bash
npm run evals:check
```

## 4. The model pipeline

Needs Python 3.11 or later. It downloads about 100 MB and runs on 8 GB of RAM. Close other heavy apps first.

```bash
make model-setup
```
```bash
make model
```
```bash
make model-test
```

`make model` downloads Cricsheet files into `model/data/raw/` (ignored by git), trains, evaluates, and writes `model/artifacts/` and `data/`. Then pick the replay match and export it:

```bash
python model/src/pick_replay.py
```

Put the chosen id in `data/replay.json`, then:

```bash
make export
```
```bash
npm run pregen
```

`npm run pregen` writes `cards.json` (needs the LLM key; without one it writes template cards).

## 5. Deploy

1. Push to `main`. Vercel builds from GitHub.
2. In Vercel → Project → Settings → Environment Variables, add every name from `.env.example` that you use. Mark the service-role key and LLM key as sensitive. Do not prefix them with `NEXT_PUBLIC_`.
3. Apply the SQL in `supabase/migrations/` (Supabase SQL editor, or the Supabase MCP server).
4. Open the deployed link in a private window on a phone. Run the checklist below.

**Pre-submission checklist**

- [ ] Private window, no login: the start screen loads
- [ ] "Show me in 2 minutes" reaches a card and the shelf
- [ ] Replay note visible on every screen
- [ ] Focus mode: a call-back arrives with the tab in the background (laptop)
- [ ] Two phones in one room show the same ball
- [ ] Supabase project is not paused
- [ ] README numbers match `model/artifacts/` and `evals/results/`; nothing unmeasured is filled in
- [ ] `docs/AI-WORKFLOW.md` is filled in truthfully
- [ ] No keys in the repo: `git grep -nE "(sk-|AIza|eyJhbGci)"` returns nothing

## 6. If the demo breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| "With friends" fails or rooms never connect | Supabase project paused after a week idle | Supabase dashboard → Restore project (takes a few minutes). Solo and the 2-minute demo still work meanwhile |
| Rooms connect but nobody appears | Anonymous sign-ins switched off | Authentication → enable Anonymous |
| Cards are all plain | LLM key missing or rate-limited; or `cards.json` not generated | This is the designed fallback and is safe to demo. To fix: check the key in Vercel, re-run `npm run pregen`, redeploy |
| Page loads but no match | A data file failed validation | Run `npm run check-data` locally; it names the bad field. Re-run `make export` |
| Friends see different balls | A device could not reach `/api/time` | Reload both. If it persists, check the function logs in Vercel |
| No notification | Permission denied, phone locked, or iPhone in a browser tab | Show it on a laptop background tab. Say the limit plainly; it is documented |
| The site is down | Vercel build failed | Vercel → Deployments → promote the last good deployment (Instant Rollback) |
| Everything is down during a live demo | | Run locally: `npm run dev`, solo mode needs no network after the first load. Keep a 60-second screen recording as a last resort, and say it is a recording |

**The safe path for any demo:** the 2-minute demo in solo mode. It depends on nothing but the static site.

## 7. Housekeeping

Delete old rooms (run in the Supabase SQL editor):

```sql
delete from public.rooms where created_at < now() - interval '7 days';
```

Rotate a leaked key at once in the provider's dashboard, update Vercel, redeploy. Then remove it from git history before pushing anything else.

## 8. What to say if asked

- "Is this live?" No. It is a replay of a real past match on a shared clock. A live feed would plug into the same adapter.
- "Why didn't my phone buzz when it was locked?" Tier 1 notifications come from the open page. Push with the app closed is designed, not built.
- "Where do the numbers come from?" Code, from Cricsheet data. The LLM only words them, and code checks the wording.
