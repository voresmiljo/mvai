-- Sagsakter pr. sag. Kør dette i Supabase SQL Editor én gang.
-- Tabellen er adskilt fra legal_sources. Grundmappen og temamapperne berøres ikke.

create extension if not exists vector;

create table if not exists public.case_upload_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  file_id text not null,
  file_name text not null,
  page int,
  part int not null default 0,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists case_upload_chunks_case_idx
  on public.case_upload_chunks (user_id, case_id, file_id);

create index if not exists case_upload_chunks_embedding_idx
  on public.case_upload_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.case_upload_chunks enable row level security;

drop policy if exists "case_upload_chunks_own" on public.case_upload_chunks;

create policy "case_upload_chunks_own"
  on public.case_upload_chunks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.case_upload_chunks to authenticated;

create or replace function public.match_case_uploads (
  query_embedding vector(1536),
  match_threshold float default 0.45,
  match_count int default 8,
  filter_case uuid default null,
  filter_files text[] default null
)
returns table (
  id uuid,
  file_id text,
  file_name text,
  page int,
  part int,
  content text,
  similarity float
)
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null or filter_case is null then
    return;
  end if;

  return query
  select
    c.id,
    c.file_id,
    c.file_name,
    c.page,
    c.part,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.case_upload_chunks c
  where
    c.user_id = auth.uid()
    and c.case_id = filter_case
    and c.embedding is not null
    and (filter_files is null or c.file_id = any(filter_files))
    and (1 - (c.embedding <=> query_embedding)) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_case_uploads(vector, float, int, uuid, text[]) to authenticated;
