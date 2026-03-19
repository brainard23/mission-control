# Mission Control PostgreSQL setup

This is the first-pass local database path for Mission Control.

It does **not** switch the API to Postgres yet. The current runtime still uses in-memory mock data.

What this gives you now:
- an initial PostgreSQL schema matching the current domain model
- a seed file aligned with the mock dashboard data
- a repeatable local setup flow using `psql`

## Prerequisites
- PostgreSQL 15+ recommended
- `psql` available on your PATH

## Environment
Set a connection string for local work:

```bash
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/mission_control
```

## Create the database

```bash
createdb mission_control
```

If you use a non-default local user, either adjust `DATABASE_URL` or run:

```bash
createdb -U your_user mission_control
```

## Apply the initial migration

From the repo root:

```bash
psql "$DATABASE_URL" -f apps/api/db/migrations/0001_init.sql
```

## Seed the local database

```bash
psql "$DATABASE_URL" -f apps/api/db/seed/0001_mock_seed.sql
```

## Quick verification

```bash
psql "$DATABASE_URL" -c "select id, name, status from agents order by id;"
psql "$DATABASE_URL" -c "select id, title, status from tasks order by created_at;"
```

## Intended next step
The next backend pass should introduce a repository adapter boundary so the API can switch between:
- in-memory mock repository
- PostgreSQL-backed repository

That keeps the current architecture direction intact while making persistence a drop-in upgrade instead of a rewrite.
