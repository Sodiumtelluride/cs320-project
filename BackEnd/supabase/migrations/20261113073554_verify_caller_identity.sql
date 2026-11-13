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
    v_claims  JSON;
    v_role    TEXT;
    v_subject UUID;
BEGIN
    -- Outside a REST request (psql, a migration, a cron job) this setting is empty,
    -- which is exactly the "this caller presented no verifiable identity" case.
    BEGIN
        v_claims  := COALESCE(
            NULLIF(current_setting('request.jwt.claims', true), ''),
            '{}'
        )::JSON;
        v_role    := NULLIF(v_claims ->> 'role', '');
        v_subject := NULLIF(v_claims ->> 'sub', '')::UUID;
    EXCEPTION WHEN others THEN
        v_claims  := NULL;
        v_role    := NULL;
        v_subject := NULL;
    END;

    -- (1) The caller authenticated and PostgREST extracted the subject for us. A
    --     caller cannot claim to be somebody else's subject, because the signature
    --     is ours.
    IF v_subject IS NOT NULL THEN
        IF v_subject IS DISTINCT FROM p_user_id THEN
            RAISE EXCEPTION 'not authorized to access this user'
                USING ERRCODE = '42501';
        END IF;
        IF p_caller_id IS NOT NULL AND p_caller_id IS DISTINCT FROM p_user_id THEN
            RAISE EXCEPTION 'not authorized to access this user'
                USING ERRCODE = '42501';
        END IF;
        RETURN;
    END IF;

    -- (2) No user token. Only the backend may write, and only when it names the
    --     caller it authenticated. anon/public/none proves nothing: p_caller_id
    --     arrives as an ordinary argument, so matching it against p_user_id would
    --     just be asking the caller to vouch for itself.
    IF v_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'caller identity could not be verified: profile edits must come from the backend key or from a signed-in user token'
            USING ERRCODE = '42501';
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

-- Grants: only the backend may call these two.
REVOKE EXECUTE ON FUNCTION
    public.require_profile_owner(UUID, UUID),
    public.update_user_details(UUID, UUID, TEXT[], TEXT[]),
    public.delete_user_details(UUID, UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.update_user_details(UUID, UUID, TEXT[], TEXT[]),
    public.delete_user_details(UUID, UUID, TEXT, TEXT)
TO service_role;

NOTIFY pgrst, 'reload schema';