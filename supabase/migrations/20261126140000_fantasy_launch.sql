BEGIN;

CREATE TABLE IF NOT EXISTS public.fantasy_launches (
  tournament_id text PRIMARY KEY CHECK (tournament_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  live_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_launches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fantasy_launches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fantasy_launches TO anon, authenticated;
GRANT INSERT (tournament_id) ON public.fantasy_launches TO authenticated;

CREATE POLICY "Public can see fantasy launch status" ON public.fantasy_launches
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners can launch fantasy tournaments" ON public.fantasy_launches
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_owner()));

CREATE OR REPLACE FUNCTION public.fantasy_live_at(p_tournament_id text)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  SELECT live_at FROM public.fantasy_launches WHERE tournament_id=p_tournament_id;
$$;

REVOKE ALL ON FUNCTION public.fantasy_live_at(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fantasy_live_at(text) TO anon, authenticated;

COMMIT;
