-- Per-IP attempt log used by the hisab-nikash-signup edge function (service role
-- only: RLS is on and there are deliberately no policies).
CREATE TABLE public.hisab_nikash_signup_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hisab_nikash_signup_attempts_ip_created_idx
  ON public.hisab_nikash_signup_attempts (ip, created_at DESC);

ALTER TABLE public.hisab_nikash_signup_attempts ENABLE ROW LEVEL SECURITY;
