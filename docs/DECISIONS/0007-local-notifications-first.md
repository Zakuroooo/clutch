# 0007. Notifications from the open page first; push with the app closed is not built

**Date:** 13 Nov 2026 · **Status:** accepted · **Changes the plan**

## Context
The plan's test for Focus mode was "an alert reaches a phone with the app in the background". True background delivery needs Web Push: a subscription stored on a server and something that sends the push at the right second. The match clock was designed to need no server job, and Vercel's free plan runs scheduled jobs at most once a day. Doing this properly needs Supabase `pg_cron` with `pg_net` or an outside scheduler, VAPID keys, and per-device testing, including the iPhone rule that push works only for apps added to the Home Screen (iOS 16.4 or later). None of that was verified on free tiers, and there are three days.

## Decision
Tier 1 call-backs are created by the open page: a Web Worker ticker, the Notifications API through a service worker, vibration, and a tab-title change. Push with the app fully closed moves to tier 3 and is documented as designed, not built (docs/TRD.md section 8).

## Why
- It covers the main case in Pranay's own story: the match beside the laptop while working, in a background tab.
- It needs no server, no keys and no subscription storage, so it cannot break the demo.
- It keeps the "no server job" property of the clock.

## Cost
- If a phone locks or the browser suspends the tab, the call-back is late or missing. The product says so.
- On iPhone, notifications need the app on the Home Screen, and there is no vibration from the web.
- "It calls your phone in your pocket" is not true of this build and must not be claimed.
