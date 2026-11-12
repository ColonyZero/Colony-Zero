# Supabase setup (free tier, optional)

The game works without this (progress stays in the browser). With it, progress is saved in the cloud and survives a new phone or cleared browser data.

1. supabase.com: New project (free plan).
2. SQL Editor: paste all of supabase/schema.sql and run it.
3. Authentication > Sign In / Providers: turn on "Allow anonymous sign-ins".
4. Project Settings > API: copy the Project URL and the anon public key.
5. Put them in characters.js: SUPABASE_URL and SUPABASE_ANON_KEY. Commit and push.

Notes
- The anon key is meant to be public. Row level security (in schema.sql) is what keeps each player's save private. Never put the service_role key in the site.
- Saves are written by the browser, so a determined player can edit their own save. Fine for a testnet. Before real rewards, move reward logic to a Supabase Edge Function.
- The leaderboard view (name, level) is ready for a Stage 3 leaderboard screen.
