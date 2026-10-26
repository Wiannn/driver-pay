-- ============================================================
-- 司机工资结算 · Supabase 建表脚本（v2 · 路线结构化版）
-- 使用方法：
--   1. 注册 https://supabase.com （免费，国内可直连）
--   2. 创建一个 Project（项目名随便，Region 选 Singapore 最近）
--   3. 左侧菜单 → SQL Editor → New query → 粘贴本文件内容 → Run
--   4. 左侧菜单 → Settings → API → 复制 Project URL 和 anon public key
--   5. 打开司机工资结算.html，把 SUPABASE_URL 和 SUPABASE_ANON_KEY 填进去
-- ============================================================

-- ---------- 司机 ----------
create table if not exists drivers (
  id          serial primary key,
  name        text not null,
  plate       text not null,
  phone       text not null default ''
);

-- ---------- 线路（结构化：始发地 + 多段步骤） ----------
create table if not exists routes (
  id              serial primary key,
  origin          text not null,
  steps           jsonb not null default '[]'::jsonb,
  total_km        numeric(10,2) not null default 0,
  total_commission numeric(10,2) not null default 0
);

-- ---------- 趟次 ----------
create table if not exists trips (
  id            serial primary key,
  date          date not null,
  driver_id     integer not null references drivers(id) on delete restrict,
  route_id      integer references routes(id) on delete set null,
  route_origin  text not null default '',
  route_steps   jsonb not null default '[]'::jsonb,
  route_name    text not null,
  km            numeric(10,2) not null default 0,
  commission    numeric(10,2) not null default 0
);

create index if not exists trips_date_idx     on trips (date);
create index if not exists trips_driver_idx   on trips (driver_id);

-- ---------- 加油 ----------
create table if not exists fuel (
  id         serial primary key,
  date       date not null,
  driver_id  integer not null references drivers(id) on delete restrict,
  place      text not null check (place in ('加油站', '仓库')),
  liters     numeric(10,2) not null default 0
);

create index if not exists fuel_date_idx    on fuel (date);
create index if not exists fuel_driver_idx  on fuel (driver_id);

-- ---------- 出勤登记（明确每一天的状态） ----------
create table if not exists attendance (
  id         serial primary key,
  date       date not null,
  driver_id  integer not null references drivers(id) on delete restrict,
  status     text not null default 'work' check (status in ('work', 'rest', 'weather')),
  note       text not null default ''
);

create unique index if not exists attendance_unique
  on attendance (date, driver_id);

create index if not exists attendance_driver_idx  on attendance (driver_id);

-- ---------- 配置（始发地、目的地列表） ----------
create table if not exists configs (
  key   text primary key,
  value jsonb not null default '[]'::jsonb
);

-- 初始化默认配置
insert into configs (key, value) values
  ('origins',   '["新库", "东库"]'::jsonb),
  ('dest_in',   '["外一", "外二", "外四", "外五", "洋山", "洋山（查验）"]'::jsonb),
  ('dest_pick', '["洋山", "沧海路", "德威八分"]'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- RLS 策略（内部小团队使用，暂时关闭限制）
-- ============================================================
alter table drivers   enable row level security;
alter table routes    enable row level security;
alter table trips     enable row level security;
alter table fuel      enable row level security;
alter table attendance enable row level security;
alter table configs   enable row level security;

drop policy if exists "allow all drivers" on drivers;
create policy "allow all drivers" on drivers for all using (true) with check (true);

drop policy if exists "allow all routes" on routes;
create policy "allow all routes" on routes for all using (true) with check (true);

drop policy if exists "allow all trips" on trips;
create policy "allow all trips" on trips for all using (true) with check (true);

drop policy if exists "allow all fuel" on fuel;
create policy "allow all fuel" on fuel for all using (true) with check (true);

drop policy if exists "allow all attendance" on attendance;
create policy "allow all attendance" on attendance for all using (true) with check (true);

drop policy if exists "allow all configs" on configs;
create policy "allow all configs" on configs for all using (true) with check (true);
