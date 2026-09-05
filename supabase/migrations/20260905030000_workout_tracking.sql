CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, workout_day_id, workout_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own workout sessions" ON public.workout_sessions
  FOR ALL TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins manage all workout sessions" ON public.workout_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.workout_set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  weight_kg NUMERIC(6,2),
  reps INTEGER CHECK (reps >= 0),
  rir NUMERIC(4,1),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, workout_exercise_id, set_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_set_logs TO authenticated;
GRANT ALL ON public.workout_set_logs TO service_role;
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own set logs" ON public.workout_set_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = session_id AND s.client_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = session_id AND s.client_id = auth.uid()
  ));

CREATE POLICY "Admins manage all set logs" ON public.workout_set_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sessions_client_date ON public.workout_sessions(client_id, workout_date DESC);
CREATE INDEX idx_sessions_day ON public.workout_sessions(workout_day_id);
CREATE INDEX idx_set_logs_session ON public.workout_set_logs(session_id);
CREATE TRIGGER workout_set_logs_updated_at BEFORE UPDATE ON public.workout_set_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
