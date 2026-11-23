ALTER TABLE public.favorite_foods
    ALTER COLUMN food_name TYPE TEXT;

CREATE FUNCTION public.set_favorite_menu_item(
    p_user_id UUID,
    p_caller_id UUID,
    p_menu_item_id BIGINT,
    p_starred BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_food_name TEXT;
BEGIN
    PERFORM public.require_profile_owner(p_user_id, p_caller_id);

    IF p_starred THEN
        SELECT name INTO v_food_name
        FROM public.menu_items
        WHERE id = p_menu_item_id
        FOR KEY SHARE;

        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;

        INSERT INTO public.favorite_foods (user_id, food_name, menu_item_id)
        VALUES (p_user_id, v_food_name, p_menu_item_id)
        ON CONFLICT (user_id, menu_item_id)
            WHERE menu_item_id IS NOT NULL
        DO NOTHING;
    ELSE
        DELETE FROM public.favorite_foods
        WHERE user_id = p_user_id
          AND menu_item_id = p_menu_item_id;
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION
    public.set_favorite_menu_item(UUID, UUID, BIGINT, BOOLEAN)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
    public.set_favorite_menu_item(UUID, UUID, BIGINT, BOOLEAN)
    TO service_role;