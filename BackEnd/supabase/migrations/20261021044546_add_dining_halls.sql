insert into dining_halls (name)
values 
    ('Worcester'),
    ('Hampshire'),
    ('Franklin'),
    ('Berkshire')
on conflict (name) do nothing;

