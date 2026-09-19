-- schema.sql
-- Paste this into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.reminders (
  id          uuid        primary key default gen_random_uuid(),
  -- Defaulting to auth.uid() means the browser never has to send user_id;
  -- Postgres stamps the logged-in user onto each new row.
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  text        text        not null,
  due_date    date,
  is_complete boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- The app always queries a single user's rows sorted by due date, so index that.
create index if not exists reminders_user_due_idx
  on public.reminders (user_id, due_date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
--
-- Without this, the public anon key would let anyone read every row. With it,
-- Postgres filters every query by the logged-in user, so the rules hold no
-- matter what the client sends.

alter table public.reminders enable row level security;

drop policy if exists "Users read their own reminders"   on public.reminders;
drop policy if exists "Users insert their own reminders" on public.reminders;
drop policy if exists "Users update their own reminders" on public.reminders;
drop policy if exists "Users delete their own reminders" on public.reminders;

create policy "Users read their own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

-- `with check` is the insert/update equivalent of `using`: it validates the
-- row being written, so nobody can create or reassign a row to another user.
create policy "Users insert their own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users update their own reminders"
  on public.reminders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);
