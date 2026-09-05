
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- emergency contacts
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  priority INT NOT NULL DEFAULT 2,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts" ON public.emergency_contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- safety sessions
CREATE TABLE public.safety_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'active',
  interval_seconds INT NOT NULL DEFAULT 3600,
  grace_seconds INT NOT NULL DEFAULT 60,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_checkin_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  escalate_at TIMESTAMPTZ,
  destination TEXT,
  expected_arrival TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_sessions TO authenticated;
GRANT ALL ON public.safety_sessions TO service_role;
ALTER TABLE public.safety_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.safety_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- check ins
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id UUID REFERENCES public.safety_sessions ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.check_ins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- emergencies
CREATE TABLE public.emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  user_name TEXT,
  type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',
  responder_status TEXT NOT NULL DEFAULT 'pending',
  responder_visible BOOLEAN NOT NULL DEFAULT true,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_label TEXT,
  last_checkin_at TIMESTAMPTZ,
  services_notified_at TIMESTAMPTZ,
  response_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergencies TO authenticated;
GRANT ALL ON public.emergencies TO service_role;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emergencies" ON public.emergencies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "responders read visible emergencies" ON public.emergencies FOR SELECT TO authenticated USING (responder_visible = true);
CREATE POLICY "responders update visible emergencies" ON public.emergencies FOR UPDATE TO authenticated USING (responder_visible = true) WITH CHECK (responder_visible = true);

-- emergency notifications
CREATE TABLE public.emergency_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES public.emergencies ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id UUID REFERENCES public.emergency_contacts ON DELETE SET NULL,
  contact_name TEXT,
  notification_type TEXT NOT NULL DEFAULT 'in_app',
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_notifications TO authenticated;
GRANT ALL ON public.emergency_notifications TO service_role;
ALTER TABLE public.emergency_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.emergency_notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "responders read visible notifications" ON public.emergency_notifications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.emergencies e WHERE e.id = emergency_id AND e.responder_visible = true));

-- safety events (history)
CREATE TABLE public.safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  emergency_id UUID REFERENCES public.emergencies ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'info',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_events TO authenticated;
GRANT ALL ON public.safety_events TO service_role;
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.safety_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "responders read events of visible emergencies" ON public.safety_events FOR SELECT TO authenticated USING (emergency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.emergencies e WHERE e.id = emergency_id AND e.responder_visible = true));

-- settings
CREATE TABLE public.safety_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  default_interval_seconds INT NOT NULL DEFAULT 3600,
  grace_seconds INT NOT NULL DEFAULT 60,
  services_delay_seconds INT NOT NULL DEFAULT 60,
  location_sharing BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_mode TEXT NOT NULL DEFAULT 'standard',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_settings TO authenticated;
GRANT ALL ON public.safety_settings TO service_role;
ALTER TABLE public.safety_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.safety_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- new user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.safety_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_events_user_created ON public.safety_events (user_id, created_at DESC);
CREATE INDEX idx_emergencies_status ON public.emergencies (status, detected_at DESC);
CREATE INDEX idx_sessions_user_status ON public.safety_sessions (user_id, status);
