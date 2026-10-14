-- Sager pr. bruger. Kør dette i Supabase SQL Editor én gang.
-- Grundmappen og temamapperne i legal_sources berøres ikke.

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  case_number text not null,
  scope text not null check (scope in ('projekt', 'plan')),
  law_reference text not null,
  preview_summary text not null default '', -- sagslokalet: chat, dokumentnavne, noter og temaer som JSON
  primary_document text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists cases_user_updated_idx
  on public.cases (user_id, updated_at desc);

alter table public.cases enable row level security;

drop policy if exists "cases_select_own" on public.cases;
drop policy if exists "cases_insert_own" on public.cases;
drop policy if exists "cases_update_own" on public.cases;
drop policy if exists "cases_delete_own" on public.cases;

create policy "cases_select_own"
  on public.cases for select
  using (auth.uid() = user_id);

create policy "cases_insert_own"
  on public.cases for insert
  with check (auth.uid() = user_id);

create policy "cases_update_own"
  on public.cases for update
  using (auth.uid() = user_id);

create policy "cases_delete_own"
  on public.cases for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.cases to authenticated;
