CREATE TYPE public.app_role AS ENUM ('admin', 'responder', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- true when the current user is a responder, or is a listed emergency contact
-- (matched on the email they signed in with) of the emergency's owner
CREATE OR REPLACE FUNCTION public.can_respond_for(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'responder')
    OR EXISTS (
      SELECT 1
      FROM public.emergency_contacts c
      WHERE c.user_id = _owner
        AND c.email IS NOT NULL
        AND lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
$$;

DROP POLICY IF EXISTS "responders read visible emergencies" ON public.emergencies;
DROP POLICY IF EXISTS "responders update visible emergencies" ON public.emergencies;
DROP POLICY IF EXISTS "responders read visible notifications" ON public.emergency_notifications;
DROP POLICY IF EXISTS "responders read events of visible emergencies" ON public.safety_events;

CREATE POLICY "responders read visible emergencies" ON public.emergencies
  FOR SELECT TO authenticated
  USING (responder_visible = true AND public.can_respond_for(user_id));

CREATE POLICY "responders update visible emergencies" ON public.emergencies
  FOR UPDATE TO authenticated
  USING (responder_visible = true AND public.can_respond_for(user_id))
  WITH CHECK (responder_visible = true AND public.can_respond_for(user_id));

CREATE POLICY "responders read visible notifications" ON public.emergency_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.emergencies e
    WHERE e.id = emergency_notifications.emergency_id
      AND e.responder_visible = true
      AND public.can_respond_for(e.user_id)
  ));

CREATE POLICY "responders read events of visible emergencies" ON public.safety_events
  FOR SELECT TO authenticated
  USING (emergency_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.emergencies e
    WHERE e.id = safety_events.emergency_id
      AND e.responder_visible = true
      AND public.can_respond_for(e.user_id)
  ));