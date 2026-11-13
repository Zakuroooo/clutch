# 0005. Private rooms without login

**Date:** 13 Nov 2026 · **Status:** accepted

## Context
The casual fan will not create an account to try a second-screen app during a match. But rooms need some notion of who is who, and the database must not be readable by everyone.

## Decision
- A room is joined with a 6-character code and a typed name. No email, no password.
- Under the surface, each device gets a Supabase **anonymous** session. Row-level security uses that id to let members read only their own room.
- All writes go through server routes using the service-role key. Clients have no write access to any table.
- Live reactions and presence use a Realtime channel named by the room's random UUID.

## Why
- No sign-up step between a friend's message and being in the room.
- Real access control without accounts.
- Server-side writes mean every rule (one call per over, calls lock when the over starts) is enforced in one place.

## Cost
- Clearing browser data loses the identity; the person rejoins as someone new.
- A 6-character code can be guessed in principle. Rooms hold a name and some points, and are short-lived.
- The Realtime channel is not authorised per message (docs/PRIVACY.md).
- Names are not moderated.
