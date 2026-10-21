
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.passwords (
    password_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(user_id)
);

CREATE TABLE IF NOT EXISTS public.favorite_foods (
    food_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_name VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(user_id)
);

CREATE TABLE IF NOT EXISTS public.allergies (
    allergy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allergy_name VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(user_id)
);

