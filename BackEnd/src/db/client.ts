import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

const { data: user, error: userError } = await supabase
  .from('users')
  .insert([
    { username: 'joe_pizza' }
  ])
  .select();

if (userError) throw userError;

const { data: password, error: passwordError } = await supabase
  .from('passwords')
  .insert([
    { password_hash: 'hashed_password_here', user_id: user[0].user_id }
  ])
  .select();

if (passwordError) throw passwordError;

const { data: favoriteFoods, error: favoriteFoodsError } = await supabase
  .from('favorite_foods')
  .insert([
    { food_name: 'Pizza', user_id: user[0].user_id },
    { food_name: 'Sushi', user_id: user[0].user_id }
  ])
  .select();

if (favoriteFoodsError) throw favoriteFoodsError;

const { data: allergies, error: allergiesError } = await supabase
  .from('allergies')
  .insert([
    { allergy_name: 'Peanuts', user_id: user[0].user_id },
    { allergy_name: 'Shellfish', user_id: user[0].user_id }
  ])
  .select();

if (allergiesError) throw allergiesError;


