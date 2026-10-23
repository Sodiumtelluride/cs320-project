alter table dining_halls
rename to locations;

alter table meals
rename column dining_hall_id to location_id;

alter table locations
add column location_type text;

alter table meal_items
add column station text;

update locations
set location_type = 'on-campus'
where location_type is null;

