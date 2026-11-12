create table public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Miner',
  level int not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
create policy "read own save" on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "insert own save" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "update own save" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create view public.leaderboard as
  select name, level, updated_at from public.saves order by level desc, updated_at asc limit 50;
grant select on public.leaderboard to anon, authenticated;
