-- Undo for everything an upload changes, not only its rows. Besides the standings or kill rows
-- it replaces, an upload can register teams in the event, create teams and players, add or move
-- players between rosters, and update in-game names. What those were before the upload is kept
-- here, so "Undo last upload" puts them back too.
--
-- Shape (all keys optional):
--   newEntries  uuid[]                          registrations the upload created
--   newTeams    uuid[]                          teams the upload created
--   newPeople   uuid[]                          players the upload created
--   people      [{id, ign}]                     in-game names before the upload
--   roster      [{person_id, entry_id|null, sort, role, captain}]   event roster places before
--   teamRoster  [{person_id, rows: [{team_id, sort, role, captain}]}]  team rosters before

alter table public.results_history add column if not exists effects jsonb;
