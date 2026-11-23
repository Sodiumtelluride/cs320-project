ALTER TABLE public.favorite_foods
    ADD COLUMN menu_item_id BIGINT
        REFERENCES public.menu_items(id)
        ON DELETE CASCADE;

CREATE UNIQUE INDEX favorite_foods_user_menu_item_key
    ON public.favorite_foods (user_id, menu_item_id)
    WHERE menu_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_user_details(
    p_user_id UUID,
    p_caller_id UUID DEFAULT NULL,
    p_foods TEXT[] DEFAULT '{}',
    p_allergies TEXT[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

--Most of this is copying existing function from other migration and updating it
BEGIN    
    PERFORM public.require_profile_owner(p_user_id, p_caller_id);

    -- Update favorite foods
    IF p_foods IS NOT NULL AND array_length(p_foods, 1) > 0 THEN
        DELETE FROM favorite_foods WHERE user_id = p_user_id AND menu_item_id IS NULL;
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
    p_user_id UUID,
    p_caller_id UUID DEFAULT NULL,
    p_food_to_delete TEXT DEFAULT NULL,
    p_allergy_to_delete TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

--Most of this is copying existing function from other migration and updating it
BEGIN
    PERFORM public.require_profile_owner(p_user_id, p_caller_id);

    IF p_food_to_delete IS NOT NULL THEN
        DELETE FROM favorite_foods WHERE user_id = p_user_id AND food_name = p_food_to_delete AND menu_item_id IS NULL;
    END IF;

    IF p_allergy_to_delete IS NOT NULL THEN
        DELETE FROM allergies WHERE user_id = p_user_id AND allergy_name = p_allergy_to_delete;
    END IF;
END;
$$;