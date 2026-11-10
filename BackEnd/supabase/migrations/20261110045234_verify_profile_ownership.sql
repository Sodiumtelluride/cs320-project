-- ---------- Ownership guard ----------

CREATE OR REPLACE FUNCTION public.require_profile_owner(
    p_user_id   UUID,
    p_caller_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subject UUID;
BEGIN
    -- The token subject, when the request carries one. Anything unparsable (no
    -- setting at all, claims that are not JSON, a sub that is not a UUID) simply
    -- means "this caller has no token identity" and p_caller_id decides.
    BEGIN
        v_subject := NULLIF(
            COALESCE(current_setting('request.jwt.claims', true), '{}')::JSON ->> 'sub',
            ''
        )::UUID;
    EXCEPTION WHEN others THEN
        v_subject := NULL;
    END;

    IF v_subject IS NOT NULL THEN
        IF v_subject IS DISTINCT FROM p_user_id THEN
            RAISE EXCEPTION 'not authorized to access this user'
                USING ERRCODE = '42501';
        END IF;
        RETURN;
    END IF;

    IF p_caller_id IS NULL THEN
        RAISE EXCEPTION 'caller identity is required to edit profile details'
            USING ERRCODE = '42501';
    END IF;

    IF p_caller_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'not authorized to access this user'
            USING ERRCODE = '42501';
    END IF;
END;
$$;

-- ---------- Profile RPCs, now caller-aware ----------

-- The ownership-blind signatures are dropped rather than left next to the new
-- ones: an overload that ignores the caller would still be reachable through
-- /rpc/update_user_details with three arguments.
DROP FUNCTION IF EXISTS public.update_user_details(UUID, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.delete_user_details(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_user_details(
    p_user_id     UUID,
    p_caller_id   UUID DEFAULT NULL,
    p_foods       TEXT[] DEFAULT '{}',
    p_allergies   TEXT[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.require_profile_owner(p_user_id, p_caller_id);

    -- Update favorite foods
    IF p_foods IS NOT NULL AND array_length(p_foods, 1) > 0 THEN
        DELETE FROM favorite_foods WHERE user_id = p_user_id;
        INSERT INTO favorite_foods (food_name, user_id)
        SELECT f, p_user_id FROM unnest(p_foods) AS f;
    END IF;

    -- Update allergies
    IF p_allergies IS NOT NULL AND array_length(p_allergies, 1) > 0 THEN
        DELETE FROM allergies WHERE user_id = p_user_id;
        INSERT INTO allergies (allergy_name, user_id)
        SELECT a, p_user_id FROM unnest(p_allergies) AS a;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_details(
    p_user_id           UUID,
    p_caller_id         UUID DEFAULT NULL,
    p_food_to_delete    TEXT DEFAULT NULL,
    p_allergy_to_delete TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.require_profile_owner(p_user_id, p_caller_id);

    IF p_food_to_delete IS NOT NULL THEN
        DELETE FROM favorite_foods WHERE user_id = p_user_id AND food_name = p_food_to_delete;
    END IF;

    IF p_allergy_to_delete IS NOT NULL THEN
        DELETE FROM allergies WHERE user_id = p_user_id AND allergy_name = p_allergy_to_delete;
    END IF;
END;
$$;

-- ---------- Grants ----------

-- require_profile_owner is internal: the RPCs call it as their owner, so anon
-- must not be able to call it straight through /rpc/.
REVOKE EXECUTE ON FUNCTION
    public.require_profile_owner(UUID, UUID),
    public.update_user_details(UUID, UUID, TEXT[], TEXT[]),
    public.delete_user_details(UUID, UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

-- anon keeps the two profile RPCs (the backend signs every profile edit with its
-- publishable key); service_role covers a service-role key as well.
GRANT EXECUTE ON FUNCTION
    public.update_user_details(UUID, UUID, TEXT[], TEXT[]),
    public.delete_user_details(UUID, UUID, TEXT, TEXT)
TO anon, service_role;

-- Reads stay; direct writes go, so a profile edit has to pass the guard.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
    public.users,
    public.passwords,
    public.favorite_foods,
    public.allergies
FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
