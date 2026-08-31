# Postgres queries

Handy queries for the production database. There's no admin UI yet, so inspect
data by connecting to Postgres directly on the server. The Dokku service is
`ikemen-db`.

## Connect

```bash
sudo dokku postgres:connect ikemen-db
```

`\q` to exit the psql prompt.

## Registered users

```sql
-- all users, newest first
SELECT id, email, display_name, timezone, is_active, created_at
FROM users
ORDER BY created_at DESC;

-- total registered
SELECT count(*) FROM users;

-- signups in the last 7 days
SELECT email, created_at FROM users
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

> Note: migration `1fe11a2c1211_seed_temporary_dev_user` seeds a temporary dev
> user, so an unfamiliar account is probably that — filter it out (or delete it)
> before real signups matter.
