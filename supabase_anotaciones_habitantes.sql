-- Ejecutar una vez en Supabase > SQL Editor.
create table if not exists public.habitante_anotaciones (
  id uuid primary key default gen_random_uuid(),
  acuario_id uuid not null references public.acuarios(id) on delete cascade,
  habitante_id uuid not null references public.habitantes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null check (char_length(trim(contenido)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists habitante_anotaciones_acuario_idx on public.habitante_anotaciones(acuario_id, created_at desc);
create index if not exists habitante_anotaciones_habitante_idx on public.habitante_anotaciones(habitante_id, created_at desc);
alter table public.habitante_anotaciones enable row level security;

drop policy if exists anotaciones_habitante_ver on public.habitante_anotaciones;
create policy anotaciones_habitante_ver on public.habitante_anotaciones
  for select using (public.puede_ver_acuario(acuario_id));

drop policy if exists anotaciones_habitante_crear on public.habitante_anotaciones;
create policy anotaciones_habitante_crear on public.habitante_anotaciones
  for insert with check (
    public.puede_editar_acuario(acuario_id)
    and usuario_id = auth.uid()
    and exists (
      select 1 from public.habitantes h
      where h.id = habitante_anotaciones.habitante_id
        and h.acuario_id = habitante_anotaciones.acuario_id
    )
  );

grant select, insert on public.habitante_anotaciones to authenticated;

-- Conserva como primera entrada las observaciones antiguas de cada habitante.
insert into public.habitante_anotaciones (acuario_id, habitante_id, usuario_id, contenido)
select h.acuario_id, h.id, a.usuario_id, trim(h.observaciones)
from public.habitantes h
join public.acuarios a on a.id = h.acuario_id
where nullif(trim(h.observaciones), '') is not null
  and not exists (
    select 1 from public.habitante_anotaciones n where n.habitante_id = h.id
  );
