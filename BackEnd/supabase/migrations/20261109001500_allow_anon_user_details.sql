-- create_user_with_details was granted to anon in 20261021183736; the two RPCs
-- added by 20261028233031 (update_user_details / delete_user_details) were not,
-- and they are also missing from the deployed database. Without this grant the
-- publishable (anon) key the backend uses gets a permission error on every
-- allergy / favorite-food edit.
GRANT EXECUTE ON FUNCTION public.update_user_details(UUID, TEXT[], TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_user_details(UUID, TEXT, TEXT) TO anon;

NOTIFY pgrst, 'reload schema';
