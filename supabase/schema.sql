create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  app_version text not null default 'v0.1.0-alpha',
  schema_version int not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  width_cm numeric not null,
  height_cm numeric not null,
  unit text not null default 'cm',
  reference_image_path text,
  reference_image_data_url text,
  reference_image_opacity numeric default 0.55,
  reference_image_visible boolean default true,
  calibration jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists furniture_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  width_cm numeric not null,
  depth_cm numeric not null,
  color text not null default '#2563eb',
  memo text,
  is_preset boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  furniture_item_id uuid references furniture_items(id) on delete set null,
  name text not null,
  category text not null default 'other',
  width_cm numeric not null,
  depth_cm numeric not null,
  x_cm numeric not null default 0,
  y_cm numeric not null default 0,
  rotation_deg numeric not null default 0,
  color text not null default '#2563eb',
  memo text,
  z_index int default 0,
  locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
alter table projects enable row level security;
alter table workspaces enable row level security;
alter table furniture_items enable row level security;
alter table placements enable row level security;

drop policy if exists "Users can manage own profiles" on profiles;
create policy "Users can manage own profiles"
on profiles
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage own projects" on projects;
create policy "Users can manage own projects"
on projects
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can manage own workspaces" on workspaces;
create policy "Users can manage own workspaces"
on workspaces
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can manage own furniture" on furniture_items;
create policy "Users can manage own furniture"
on furniture_items
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can manage own placements" on placements;
create policy "Users can manage own placements"
on placements
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create index if not exists projects_owner_id_idx on projects(owner_id);
create index if not exists workspaces_owner_id_idx on workspaces(owner_id);
create index if not exists workspaces_project_id_idx on workspaces(project_id);
create index if not exists furniture_items_owner_id_idx on furniture_items(owner_id);
create index if not exists furniture_items_project_id_idx on furniture_items(project_id);
create index if not exists placements_owner_id_idx on placements(owner_id);
create index if not exists placements_project_id_idx on placements(project_id);
create index if not exists placements_workspace_id_idx on placements(workspace_id);
