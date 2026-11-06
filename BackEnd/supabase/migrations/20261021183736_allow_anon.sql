GRANT EXECUTE ON FUNCTION public.create_user_with_details(TEXT, TEXT, TEXT[], TEXT[]) TO anon;

NOTIFY pgrst, 'reload schema';