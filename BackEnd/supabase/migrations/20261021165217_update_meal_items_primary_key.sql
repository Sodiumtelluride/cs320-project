alter table meal_items
drop constraint meal_items_pkey;

alter table meal_items
alter column station set not null;

alter table meal_items
add primary key (meal_id, menu_item_id, station);