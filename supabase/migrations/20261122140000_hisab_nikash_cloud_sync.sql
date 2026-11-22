-- Cloud copy of each shop's data, so the same phone number shows the same shop on every device.
--
-- One row per record (a product, a sale, a purchase, a due, a payment, a customer profile or a
-- setting). The app keeps working offline from its own copy on the device and syncs here when it
-- is online. Conflicts are settled per record, last write wins, by the edit time `ts` (ms) the
-- device stamped on the record. A delete is kept as a tombstone (deleted = true) so another device
-- does not bring the record back. `synced_at` is the server's own clock and is only used as the
-- pull cursor (devices ask for everything newer than the last one they saw).
--
-- Every object is prefixed hisab_nikash_ (this Supabase project is shared with other apps).

CREATE TABLE public.hisab_nikash_records (
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coll      text        NOT NULL CHECK (coll IN ('products','sales','purchases','dues','payments','profiles','meta')),
  id        text        NOT NULL,
  data      jsonb,
  deleted   boolean     NOT NULL DEFAULT false,
  ts        bigint      NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, coll, id)
);

CREATE INDEX hisab_nikash_records_user_synced_idx
  ON public.hisab_nikash_records (user_id, synced_at);

ALTER TABLE public.hisab_nikash_records ENABLE ROW LEVEL SECURITY;

-- Each account only ever sees and writes its own rows.
CREATE POLICY "hisab_nikash_records_select_own" ON public.hisab_nikash_records
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "hisab_nikash_records_insert_own" ON public.hisab_nikash_records
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "hisab_nikash_records_update_own" ON public.hisab_nikash_records
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Push a batch of records: [{coll, id, data, deleted, ts}, ...]. A row is only replaced by a newer
-- edit (last write wins), so an old device that comes online late cannot overwrite newer data.
-- Returns how many rows were written.
CREATE OR REPLACE FUNCTION public.hisab_nikash_sync_push(records jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  written integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  WITH up AS (
    INSERT INTO public.hisab_nikash_records AS r (user_id, coll, id, data, deleted, ts)
    SELECT
      auth.uid(),
      x->>'coll',
      x->>'id',
      CASE WHEN COALESCE((x->>'deleted')::boolean, false) THEN NULL ELSE x->'data' END,
      COALESCE((x->>'deleted')::boolean, false),
      (x->>'ts')::bigint
    FROM jsonb_array_elements(records) AS x
    ON CONFLICT (user_id, coll, id) DO UPDATE
      SET data = EXCLUDED.data,
          deleted = EXCLUDED.deleted,
          ts = EXCLUDED.ts,
          synced_at = clock_timestamp()
      WHERE r.ts < EXCLUDED.ts
    RETURNING 1
  )
  SELECT count(*) INTO written FROM up;

  RETURN written;
END;
$$;

REVOKE ALL ON FUNCTION public.hisab_nikash_sync_push(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hisab_nikash_sync_push(jsonb) TO authenticated;
