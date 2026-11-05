-- A refresh replaces one location/day in a single statement. Old normalized
-- menu tables remain available to the legacy endpoints.
create table if not exists public.menu_snapshots (
  location text not null,
  date date not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (location, date)
);

alter table public.menu_snapshots enable row level security;
grant select on public.menu_snapshots to anon, authenticated;
create policy "public can read menu snapshots" on public.menu_snapshots for select to anon, authenticated using (true);
grant select, insert, update on public.menu_snapshots to service_role;
