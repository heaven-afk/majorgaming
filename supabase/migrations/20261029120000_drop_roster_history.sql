-- The roster change log isn't needed (owner, 2026-10-29): each event keeps the roster that
-- played it, and that is enough history. Removes the table added by 20261029110000.

drop table if exists public.roster_history;
