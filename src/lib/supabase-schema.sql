-- 1. Aktivér pgvector udvidelsen til semantisk vektorsøgning
create extension if not exists vector;

-- 2. Opret tabellen til det juridiske kildebibliotek (Grundlovgivning, Temamapper & Afgørelser)
create table if not exists legal_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,                       -- f.eks. "MFKN Kendelse 21/04322" eller "Miljøvurderingsloven"
  citation text not null,                    -- f.eks. "MFKN j.nr. 21/04322 af 18/11/2021"
  law_section text,                          -- f.eks. "§ 8", "§ 21, stk. 2", "Habitatbekendtgørelsen § 6"
  content text not null,                     -- Selve tekstafsnittet / præmissen
  source_type text not null default 'lov',   -- 'lov', 'bekendtgoerelse', 'vejledning', 'naevnskendelse', 'eu_dom'
  scope text default 'begge',                -- 'plan', 'projekt', 'begge'
  theme text,                                -- f.eks. 'natura2000', 'artsbeskyttelse', 'naevnspraksis', 'stoej_og_luft', 'grundvand'
  pdf_file_name text,                        -- Originalt PDF filnavn til download
  pdf_url text,                              -- URL til original PDF
  metadata jsonb default '{}'::jsonb,        -- Ekstra metadata (dato, side, myndighed, sagsnr)
  embedding vector(1536),                    -- Vektor fra text-embedding-3-small (OpenAI)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Opret indeks for lynhurtig vektorsøgning (HNSW indeks med cosinus lighed)
create index if not exists legal_sources_embedding_idx
  on legal_sources
  using hnsw (embedding vector_cosine_ops);

-- 4. Opret indeks for hurtig temamappe- og scope-filtrering
create index if not exists legal_sources_theme_idx on legal_sources (theme);
create index if not exists legal_sources_scope_idx on legal_sources (scope);

-- 5. Søgefunktion: Match dokumenter baseret på vektor og valgte temamapper
create or replace function match_legal_sources (
  query_embedding vector(1536),
  match_threshold float default 0.60,
  match_count int default 5,
  filter_themes text[] default null,
  filter_scope text default null
)
returns table (
  id uuid,
  title text,
  citation text,
  law_section text,
  content text,
  source_type text,
  theme text,
  pdf_file_name text,
  pdf_url text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ls.id,
    ls.title,
    ls.citation,
    ls.law_section,
    ls.content,
    ls.source_type,
    ls.theme,
    ls.pdf_file_name,
    ls.pdf_url,
    ls.metadata,
    1 - (ls.embedding <=> query_embedding) as similarity
  from legal_sources ls
  where
    (filter_themes is null or ls.theme is null or ls.theme = any(filter_themes))
    and (filter_scope is null or ls.scope = 'begge' or ls.scope = filter_scope)
    and (1 - (ls.embedding <=> query_embedding)) > match_threshold
  order by ls.embedding <=> query_embedding
  limit match_count;
end;
$$;
