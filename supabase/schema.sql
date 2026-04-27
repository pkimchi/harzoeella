-- HarZoElla Health Tracker — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Daily logs: checklist + steps + lazy day flag
create table if not exists daily_logs (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  date          date        not null,
  water         boolean     default false,
  vitamins      boolean     default false,
  healthy_eating boolean    default false,
  sleep_7hrs    boolean     default false,
  stretch       boolean     default false,
  steps         integer     default 0,
  is_lazy_day   boolean     default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, date)
);

-- Workouts
create table if not exists workouts (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade not null,
  date            date        not null,
  duration_minutes integer    not null,
  completed       boolean     default true,
  created_at      timestamptz default now()
);

-- Weight logs
create table if not exists weight_logs (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  date       date        not null,
  weight     decimal(5,1) not null,
  unit       varchar(3)  default 'lbs',
  created_at timestamptz default now()
);

-- Blood pressure logs
create table if not exists bp_logs (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  date       date        not null,
  systolic   integer     not null,
  diastolic  integer     not null,
  pulse      integer,
  notes      text,
  created_at timestamptz default now()
);

-- User preferences
create table if not exists user_prefs (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             uuid        references auth.users(id) on delete cascade not null unique,
  weight_unit         varchar(3)  default 'lbs',
  reminder_morning    boolean     default false,
  reminder_morning_time varchar(5) default '07:00',
  reminder_evening    boolean     default false,
  reminder_evening_time varchar(5) default '21:00',
  display_name        text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Indexes
create index if not exists daily_logs_user_date on daily_logs(user_id, date desc);
create index if not exists workouts_user_date   on workouts(user_id, date desc);
create index if not exists weight_logs_user_date on weight_logs(user_id, date desc);
create index if not exists bp_logs_user_date    on bp_logs(user_id, date desc);

-- Enable Row Level Security
alter table daily_logs   enable row level security;
alter table workouts     enable row level security;
alter table weight_logs  enable row level security;
alter table bp_logs      enable row level security;
alter table user_prefs   enable row level security;

-- RLS Policies — users can only access their own rows

create policy "daily_logs: own rows"  on daily_logs  for all using (auth.uid() = user_id);
create policy "workouts: own rows"    on workouts     for all using (auth.uid() = user_id);
create policy "weight_logs: own rows" on weight_logs  for all using (auth.uid() = user_id);
create policy "bp_logs: own rows"     on bp_logs      for all using (auth.uid() = user_id);
create policy "user_prefs: own rows"  on user_prefs   for all using (auth.uid() = user_id);
