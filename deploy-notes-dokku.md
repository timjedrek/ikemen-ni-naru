# Deploy notes — Dokku on Linode (Phase D)

Runbook for deploying **ikemen ni naru** to a single Linode via Dokku: two apps
(`frontend` Qwik Node server, `backend` FastAPI) + Postgres, served single-origin
under one host with the API at `/api`.

See [`build-plan-updated-for-deployment.md`](build-plan-updated-for-deployment.md)
Phase D and the Phase C log entry in [`log.md`](log.md) for how the images were built.

---

## 0. Fill in these placeholders

| Placeholder | Value |
|---|---|
| `SERVER_IP` | your Linode's public IPv4 |
| `DOMAIN` | `health.timjedrek.com` |
| `LE_EMAIL` | `tim@rightruddermarketing.com` (Let's Encrypt) |
| `backend` / `frontend` | the two Dokku app names (used throughout) |
| `healthdb` | the Postgres service name |

**Topology (decided):** `DOMAIN/` → frontend, `DOMAIN/api/*` → backend. Same
origin ⇒ zero CORS; session cookie is host-only `SameSite=Lax; Secure`.
Postgres stays internal (linked over Dokku's docker network, never public).

---

## 1. One prerequisite before deploy — proxy-aware uvicorn (backend Dockerfile)

The backend runs behind nginx (TLS terminates there). Make uvicorn trust the
proxy headers so it sees the real scheme/client IP. In `backend/Dockerfile`, the
`CMD` should be:

```dockerfile
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips=*"]
```

(Only `--proxy-headers --forwarded-allow-ips=*` added.) Commit before you push.
Cookie `Secure` is already driven by `ENVIRONMENT=production`, so this is about
correctness of forwarded scheme/IP, not the cookie.

---

## 2. Server prep (as a sudo user on the Linode)

```bash
# System up to date
sudo apt update && sudo apt -y upgrade

# Install Dokku (pin to a current release tag; check dokku.com for latest)
wget -NP . https://dokku.com/install/v0.35.20/bootstrap.sh
sudo DOKKU_TAG=v0.35.20 bash bootstrap.sh
```

Point DNS **now** so Let's Encrypt can validate later:

- `A  DOMAIN  ->  SERVER_IP`

Register your SSH key with Dokku (this is the key that will `git push`):

```bash
# Run on the SERVER; paste your PUBLIC key, or cat it in:
cat ~/.ssh/authorized_keys | dokku ssh-keys:add admin
```

Set the global vhost domain (optional but tidy):

```bash
dokku domains:set-global timjedrek.com
```

---

## 3. Install plugins (as root/sudo on the server)

```bash
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
```

---

## 4. Create the two apps + point each at its subdirectory (monorepo)

The repo is a monorepo; each app builds from its own subdir. `build-dir` sets the
build **context** to that subdir so each Dockerfile's relative `COPY`s resolve
exactly like they do locally.

```bash
dokku apps:create backend
dokku apps:create frontend

# Must be set BEFORE the first push:
dokku builder:set backend  build-dir backend
dokku builder:set frontend build-dir frontend
```

Dokku auto-detects `Dockerfile` in each build-dir and uses the Dockerfile builder.

---

## 5. Postgres — create, link, fix the URL scheme

```bash
dokku postgres:create healthdb
dokku postgres:link healthdb backend      # injects DATABASE_URL=postgres://...
```

**Scheme fix (required):** dokku-postgres injects `postgres://…`, but SQLAlchemy
2.0 + psycopg3 needs `postgresql+psycopg://…`. Rewrite it in place:

```bash
URL=$(dokku config:get backend DATABASE_URL)
dokku config:set --no-restart backend DATABASE_URL="postgresql+psycopg://${URL#postgres://}"
```

Caveat: if you ever `dokku postgres:promote`, it resets `DATABASE_URL` back to
`postgres://` — re-run the rewrite. The DB host in the URL
(`dokku-postgres-healthdb`) is internal-only and reachable because `link`
attaches the app to the service's network.

---

## 6. Backend env vars

```bash
dokku config:set backend \
  ENVIRONMENT=production \
  DEBUG=false \
  SECRET_KEY="$(openssl rand -hex 32)" \
  FRONTEND_URL="https://DOMAIN" \
  CORS_ORIGINS="https://DOMAIN" \
  WEB_CONCURRENCY=2
```

(`DATABASE_URL` is already set from step 5. `cookie_secure` flips on
automatically because `ENVIRONMENT != development`. CORS isn't strictly needed
same-origin, but setting the exact origin is harmless and future-proof.)

Frontend needs **no runtime config** — `PUBLIC_API_BASE_URL` is baked to the
relative `/api/v1` at build time via the Dockerfile ARG default.

---

## 7. Add git remotes and deploy (from your LOCAL machine, repo root)

Two apps ⇒ two remotes, same branch pushed to each. `build-dir` makes each build
the right subdir; the backend's `app.json` runs `alembic upgrade head` as a
predeploy step (migrations never run on app startup).

```bash
git remote add dokku-backend  dokku@SERVER_IP:backend
git remote add dokku-frontend dokku@SERVER_IP:frontend

git push dokku-backend  main
git push dokku-frontend main
```

Watch the backend deploy logs — you should see the predeploy `alembic upgrade
head` create the schema. Manual fallback if needed:

```bash
dokku run backend alembic upgrade head
```

Verify the backend is up on its own (before wiring the domain):

```bash
dokku ports:report backend        # confirm the http mapping (80 -> 8000)
dokku logs backend --tail
```

---

## 8. Domains + the single-origin `/api` nginx route

Give the domain to the **frontend** only. The backend needs no public domain —
it's reached via its nginx upstream.

```bash
dokku domains:set frontend DOMAIN
dokku domains:clear backend        # backend has no public vhost
```

Now add a custom `location /api/` to the frontend's nginx that proxies to the
backend's upstream. **First discover the upstream name** Dokku generated for the
backend (it looks like `backend-8000`):

```bash
sudo nginx -T | grep -A2 "upstream .*backend"
```

If nothing prints (no upstream because backend has no domain), give the backend a
dummy, DNS-less domain so its config — and thus its upstream — is generated, then
re-check:

```bash
dokku domains:set backend backend.internal
dokku proxy:build-config backend
sudo nginx -T | grep -A2 "upstream .*backend"
```

Create the route file (replace `UPSTREAM` with the name you found):

```bash
sudo mkdir -p /home/dokku/frontend/nginx.conf.d
sudo tee /home/dokku/frontend/nginx.conf.d/api.conf >/dev/null <<'EOF'
location /api/ {
    proxy_pass http://UPSTREAM;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
EOF
sudo chown dokku:dokku /home/dokku/frontend/nginx.conf.d/api.conf
sudo nginx -t && sudo systemctl reload nginx
```

Notes:
- `proxy_pass http://UPSTREAM;` with **no path** preserves the original URI, so
  `/api/v1/health` reaches the backend unchanged (backend serves under
  `/api/v1`). Do **not** add a trailing `/` or you'll strip the prefix.
- This file lives inside the frontend's `server {}` block, so once TLS is on
  (step 9) `/api` is HTTPS too — the backend needs no cert of its own.
- It survives redeploys of the frontend (Dokku re-includes `nginx.conf.d/*`).

---

## 9. HTTPS (Let's Encrypt) + force redirect

```bash
dokku letsencrypt:set frontend email LE_EMAIL
dokku letsencrypt:enable frontend        # issues cert, adds http->https redirect
dokku letsencrypt:cron-job --add         # auto-renew
```

The single cert on the frontend covers `/` and `/api` (same server block).

---

## 10. Verify (project done-when)

```bash
# API through the public origin:
curl -sS https://DOMAIN/api/v1/health          # -> {"status":"ok"}

# Frontend SSR:
curl -sSI https://DOMAIN/                       # -> 200, text/html
```

Then in a browser at `https://DOMAIN`: register → log in → add a food/weight/
mood/sleep entry → open the dashboard charts → drill into a day. Confirm the
session persists across navigations (cookie set on `DOMAIN`, `Secure`, `Lax`).

---

## Redeploy / operate cheatsheet

```bash
# Ship new code:
git push dokku-backend main            # runs migrations via predeploy
git push dokku-frontend main

# One-off backend commands:
dokku run backend alembic upgrade head
dokku run backend alembic current

# Logs / config / restart:
dokku logs backend --tail
dokku config:show backend
dokku ps:restart frontend

# Postgres:
dokku postgres:info healthdb
dokku postgres:connect healthdb        # psql shell
```

---

## Simpler fallback if the `/api` nginx wiring fights you

Put the backend on its own subdomain instead of a path:

- `dokku domains:set backend api.DOMAIN`, add DNS `A api.DOMAIN -> SERVER_IP`,
  `dokku letsencrypt:enable backend`.
- Rebuild the frontend with `--build-arg PUBLIC_API_BASE_URL=https://api.DOMAIN/api/v1`
  (`dokku docker-options:add frontend build "--build-arg PUBLIC_API_BASE_URL=https://api.DOMAIN/api/v1"` then redeploy).
- Set backend `CORS_ORIGINS=https://DOMAIN` (now genuinely needed — different
  origin). `api.DOMAIN` and `DOMAIN` are the same site, so the `SameSite=Lax`
  cookie still works.

Skips all custom nginx at the cost of a second cert + real CORS.
