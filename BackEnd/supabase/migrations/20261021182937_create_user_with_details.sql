CREATE OR REPLACE FUNCTION public.create_user_with_details(
    p_username      TEXT,
    p_password_hash TEXT,
    p_foods         TEXT[] DEFAULT '{}',
    p_allergies     TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    INSERT INTO public.users (username)
    VALUES (p_username)
    RETURNING user_id INTO v_user_id;

    INSERT INTO public.passwords (password_hash, user_id)
    VALUES (p_password_hash, v_user_id);

    INSERT INTO public.favorite_foods (food_name, user_id)
    SELECT f, v_user_id FROM unnest(p_foods) AS f;

    INSERT INTO public.allergies (allergy_name, user_id)
    SELECT a, v_user_id FROM unnest(p_allergies) AS a;

    RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_user_with_details FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_user_with_details TO service_role;

NOTIFY pgrst, 'reload schema';