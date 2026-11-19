ALTER TABLE menu_items
ADD CONSTRAINT menu_items_unique_food
UNIQUE (name, calories, serving_size);