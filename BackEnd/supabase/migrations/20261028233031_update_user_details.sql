CREATE OR REPLACE FUNCTION public.update_user_details(
    p_user_id      UUID,
    p_foods         TEXT[] DEFAULT '{}',
    p_allergies     TEXT[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Delete function
CREATE OR REPLACE FUNCTION public.delete_user_details(
    p_user_id         UUID,
    p_food_to_delete  TEXT DEFAULT NULL,
    p_allergy_to_delete TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_food_to_delete IS NOT NULL THEN
        DELETE FROM favorite_foods WHERE user_id = p_user_id AND food_name = p_food_to_delete;
    END IF;

    IF p_allergy_to_delete IS NOT NULL THEN
        DELETE FROM allergies WHERE user_id = p_user_id AND allergy_name = p_allergy_to_delete;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_user_details FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_details TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_user_details FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_details TO service_role;

NOTIFY pgrst, 'reload schema';