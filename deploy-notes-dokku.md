# Deploy notes — Dokku on Linode (Phase D)

Runbook for deploying **ikemen ni naru** to a dedicated Ubuntu Linode via
Dokku: two apps (`frontend` Qwik Node server, `backend` FastAPI) + Postgres,
served single-origin under one host with the API at `/api`.

See [`build-plan-updated-for-deployment.md`](build-plan-updated-for-deployment.md)
Phase D and the Phase C log entry in [`log.md`](log.md) for how the images were
built.

This is **one git repo**. Do not `git init` inside `backend/` or `frontend/`.

---

## 0. Fill in these placeholders

| Placeholder | Value |
|---|---|
| `SERVER_IP` | Linode public IPv4 |
| `DOMAIN` | `health.timjedrek.com` |
| `LE_EMAIL` | `tim@timjedrek.com` (Let's Encrypt) |
| `SUDO_USER` | Linux login you create in step 2 (e.g. `tim`) |
| `backend` / `frontend` | the two Dokku app names (used throughout). **Actual: `ikemen-backend` / `ikemen-frontend`** |
| `healthdb` | the Postgres service name. **Actual: `ikemen-db`** |

**Topology (decided):** `DOMAIN/` → frontend, `DOMAIN/api/*` → backend. Same
origin ⇒ zero CORS; session cookie is host-only `SameSite=Lax; Secure`.
Postgres stays internal (linked over Dokku's docker network, never public).

**Who is who**

| Identity | Job |
|---|---|
| `root` | First Linode login only. `apt`, create `SUDO_USER`, then lock it out. |
| `SUDO_USER` | Daily SSH. Run `sudo dokku …`, plugins, nginx snippets, firewall. |
| `dokku` | Git receive only (`git push dokku@SERVER_IP:backend`). Not a shell. |
| `app` / `node` in containers | Already non-root in the Dockerfiles. |

`git push` does **not** use `SUDO_USER`. It uses the `dokku` user plus a key
you register with `dokku ssh-keys:add`.

Commands tagged **laptop** run on Omarchy. Commands tagged **server** run on
the Linode.

### Same muscle memory as your Rails Dokku notes

Your old Rails runbook (apt → `adduser` → SSH key → `usermod -aG sudo` →
Dokku → postgres:create/link → git remote → push → domain → Let's Encrypt)
is still the spine. This file is that, updated. Differences:

| Your Rails notes (2022) | This app |
|---|---|
| `apt update` / `upgrade -y` / `autoremove` / reboot-required | Same (step 2) |
| `adduser` → `su -` → `~/.ssh/authorized_keys` → root `usermod -aG sudo` | Same (step 2) |
| `cat ~/.ssh/id_rsa.pub` | New laptop may be `id_ed25519.pub` (step 2) |
| Dokku bootstrap `v0.26.8` | Current pin in step 5 (`v0.38.27`) |
| One app, Herokuish/buildpack, `Procfile` | Two Dockerfile apps + `build-dir` (step 7) |
| `postgres:link` `DATABASE_URL` as-is | Must rewrite to `postgresql+psycopg://` (step 8) |
| `dokku run … rails db:migrate` | `app.json` predeploy `alembic upgrade head` |
| Redis plugin | Not used |
| `domains:set` www **and** apex + redirect plugin | One name: `health.timjedrek.com` |
| `config:set --global DOKKU_LETSENCRYPT_EMAIL=…` | `letsencrypt:set --global email …` (step 6) |
| S3 CORS, Tailwind, Action Text, Alpine | N/A |

Keep the extra bits your Rails notes skipped: swap (Node build on 2 GB), UFW,
disable root SSH after the sudo user works, `/api` nginx glue.

---

## 1. One prerequisite before deploy — proxy-aware uvicorn

The backend runs behind nginx (TLS terminates there). Make uvicorn trust the
proxy headers so it sees the real scheme/client IP. In `backend/Dockerfile`,
the `CMD` should be:

```dockerfile
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips=*"]
```

(Only `--proxy-headers --forwarded-allow-ips=*` added.) Commit before you
push. Cookie `Secure` is already driven by `ENVIRONMENT=production`, so this
is about forwarded scheme/IP, not the cookie.

---

## 2. First login: updates, new user, SSH, then sudo

This is the same first-boot you use for Rails boxes. Linode hands you
**root**. Do not stay there.

### 2a. Laptop — copy your public key

Your old notes used RSA (`id_rsa.pub`). Omarchy may already have Ed25519.
Either works; paste **one** line into `authorized_keys`.

```bash
# laptop
cd ~/.ssh
ls
# prefer Ed25519; fall back to RSA from the old laptop
cat id_ed25519.pub 2>/dev/null || cat id_rsa.pub
```

If neither file exists: `ssh-keygen -t ed25519 -C "omarchy-ikemen"` then `cat`
the `.pub` again.

### 2b. Server as root — packages, maybe reboot

```bash
# laptop
ssh root@SERVER_IP
```

```bash
# server (root) — same sequence as your Rails notes
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

cat /var/run/reboot-required
# if it prints "reboot required" → sudo reboot, then ssh root@SERVER_IP again
# if "No such file" → no reboot
```

### 2c. Server as root — create the user

```bash
# server (root)
adduser SUDO_USER
# password + the gecos prompts (name/room/phone — Enter through them)
```

### 2d. Drop into that user and add the SSH key

Same as your notes: `su -`, then `authorized_keys`, not as root's `~/.ssh`.

```bash
# server (root)
su - SUDO_USER
mkdir ~/.ssh
touch ~/.ssh/authorized_keys
nano ~/.ssh/authorized_keys
# paste the one pubkey line from the laptop, save
chmod 700 ~/.ssh #GROK EXTRA STEPS. Skip?
chmod 600 ~/.ssh/authorized_keys #GROK EXTRA STEPS.. SKIP?
exit
```

### 2e. Back to root — grant sudo

```bash
# server (root)
usermod -aG sudo SUDO_USER
id SUDO_USER
# expect: uid=…(SUDO_USER) gid=…(SUDO_USER) groups=…,sudo
```

### 2f. Laptop — prove the user works *before* locking root

Open a **new** terminal (leave the root session up):

```bash
# laptop
ssh SUDO_USER@SERVER_IP
sudo -v    # asks for SUDO_USER's password, then works
```

Only after that works, disable password SSH and root login (your Rails notes
didn't do this; do it here):

```bash
# server (as SUDO_USER)
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload ssh    # Ubuntu 24.04: ssh.service (not sshd)
```

Confirm a **third** terminal can still `ssh SUDO_USER@SERVER_IP` before you
close the root session. From here on, every server command is as `SUDO_USER`
with `sudo` where needed.

Optional SSH config on the laptop:

```bash
# laptop
cat >> ~/.ssh/config <<EOF
Host ikemen
  HostName SERVER_IP
  User SUDO_USER
  IdentityFile ~/.ssh/id_ed25519
EOF
# then: ssh ikemen
# If you still use RSA, IdentityFile ~/.ssh/id_rsa
```

---

## 3. Swap, firewall, timezone

2 GB is enough to *run* this app. A Node `qwik build` on the box can still
OOM without swap.

```bash
# server
sudo timedatectl set-timezone America/Los_Angeles   # or your zone

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 4. Point DNS now

Let's Encrypt needs the name resolving **before** you request a cert.

| Type | Name | Value |
|---|---|---|
| A | `health` | `SERVER_IP` |

That is `DOMAIN` → the Linode.

```bash
# laptop — keep retrying until it prints SERVER_IP
dig +short DOMAIN A
```

If DNS is on Cloudflare, use **DNS only** (grey cloud), not proxied. Orange
cloud breaks Dokku's HTTP-01 challenge.

---

## 5. Install Dokku

Pin to a current release. Check https://dokku.com/docs/getting-started/installation/
if this tag is stale.

```bash
# server
wget -NP . https://dokku.com/install/v0.38.27/bootstrap.sh
sudo DOKKU_TAG=v0.38.27 bash bootstrap.sh
```

Takes 5–10 minutes. Installs Docker and nginx.

Register the **same** laptop pubkey so `git push dokku@…` works. Dokku does
not reuse `SUDO_USER`'s authorized_keys for git:

```bash
# server (as SUDO_USER) — only your one pubkey line
sudo dokku ssh-keys:add omarchy "$(cat ~/.ssh/authorized_keys)"
sudo dokku ssh-keys:list
```

Global vhost (unused for this app; we set a real domain per app later). IP is
fine:

```bash
# server
sudo dokku domains:set-global SERVER_IP
```

Sanity check from the laptop — this must print Dokku's command list, **not**
a Linux shell:

```bash
# laptop
ssh dokku@SERVER_IP help
```

If that fails, git push will fail. Fix `ssh-keys:add` before continuing.

---

## 6. Plugins: Postgres + Let's Encrypt

```bash
# server
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
sudo dokku letsencrypt:set --global email LE_EMAIL
sudo dokku letsencrypt:cron-job --add
```

---

## 7. Create the two apps + point each at its subdirectory (monorepo)

Each app builds from its own subdir. `build-dir` sets the build **context**
so each Dockerfile's relative `COPY`s resolve exactly like they do locally.

```bash
# server
sudo dokku apps:create backend
sudo dokku apps:create frontend

# Must be set BEFORE the first push:
sudo dokku builder:set backend  build-dir backend
sudo dokku builder:set frontend build-dir frontend
```

Dokku auto-detects `Dockerfile` in each build-dir and uses the Dockerfile
builder.

---

## 8. Postgres — create, link, fix the URL scheme

```bash
# server
sudo dokku postgres:create healthdb
sudo dokku postgres:link healthdb backend      # injects DATABASE_URL=postgres://...
```

**Scheme fix (required):** dokku-postgres injects `postgres://…`, but
SQLAlchemy 2.0 + psycopg3 needs `postgresql+psycopg://…`. Rewrite it:

```bash
# server
URL="$(sudo dokku config:get backend DATABASE_URL)"
echo "old: $URL"
sudo dokku config:set --no-restart backend \
  DATABASE_URL="postgresql+psycopg://${URL#postgres://}"
sudo dokku config:get backend DATABASE_URL
```

Caveat: `dokku postgres:promote` resets `DATABASE_URL` back to `postgres://`
— re-run the rewrite. The DB host (`dokku-postgres-healthdb`) is
internal-only; `link` attaches the app to the service's network.

---

## 9. Backend env vars

```bash
# server
SECRET="$(openssl rand -hex 32)"
echo "SECRET_KEY=$SECRET"    # save this off the box too

sudo dokku config:set backend \
  ENVIRONMENT=production \
  DEBUG=false \
  LOG_LEVEL=INFO \
  SECRET_KEY="$SECRET" \
  FRONTEND_URL="https://DOMAIN" \
  CORS_ORIGINS="https://DOMAIN" \
  WEB_CONCURRENCY=1
```

`WEB_CONCURRENCY=1` is one uvicorn worker — right for a 2 GB box and a
private tracker. (`DATABASE_URL` is already set from step 8.
`cookie_secure` flips on because `ENVIRONMENT != development`. CORS isn't
strictly needed same-origin, but an exact origin is harmless.)

Frontend needs **no runtime config** — `PUBLIC_API_BASE_URL` is baked to
`/api/v1` at image build via the Dockerfile ARG default. Do not
`dokku config:set frontend PUBLIC_API_BASE_URL=…`; Vite will not see it.

---

## 10. Laptop remotes and first deploys

Two apps ⇒ two remotes on **this** repo. Push the same `main` to each.
`build-dir` picks the subfolder. Backend `app.json` runs
`alembic upgrade head` as a predeploy step (migrations never run on startup).

```bash
# laptop — repo root, not inside backend/ or frontend/
git remote add dokku-backend  dokku@SERVER_IP:backend
git remote add dokku-frontend dokku@SERVER_IP:frontend
git remote -v
```

Backend first (needs the database):

```bash
# laptop
git push dokku-backend main
```

First push pulls Python 3.14 images; several minutes. Watch for predeploy
`alembic upgrade head`. Manual fallback:

```bash
# server
sudo dokku run backend alembic upgrade head
sudo dokku run backend alembic current
# expect: dd1361b0bad5 (head)  (or whatever current head is)
```

```bash
# server
sudo dokku ports:report backend
sudo dokku logs backend --num 50
sudo dokku nginx:show-config backend | head -40
```

Note the upstream name (`backend-8000` or `backend-5000`). Needed in step 11.

Then frontend (Node `npm ci` + `qwik build` is the RAM spike — that's why
swap exists):

```bash
# laptop
git push dokku-frontend main
```

```bash
# server
sudo dokku logs frontend --num 30
# expect: Node server listening on http://localhost:PORT
```

`http://DOMAIN/` may already serve Qwik. `/api/v1/…` will not work yet —
that's still hitting Node. Next step glues them.

---

## 11. Domains + the single-origin `/api` nginx route

Give the public name to the **frontend** only. If both apps have it, nginx
fights itself.

```bash
# server
sudo dokku domains:set frontend DOMAIN
sudo dokku domains:clear backend
sudo dokku domains:report frontend
sudo dokku domains:report backend
```

Custom `location /api/` on the frontend proxies to the backend upstream.
This file lives on the **server**, not in git. Dokku includes
`nginx.conf.d/*.conf` inside the app's `server { }`.

Discover the upstream (from step 10, or):

```bash
# server
sudo nginx -T | grep -A2 "upstream .*backend"
```

If nothing prints (no upstream because backend has no domain), give it a
dummy, DNS-less name so nginx still generates the upstream:

```bash
# server
sudo dokku domains:set backend backend.internal
sudo dokku proxy:build-config backend
sudo nginx -T | grep -A2 "upstream .*backend"
```

Create the route (replace `UPSTREAM` with that name, e.g. `backend-5000`).
**No trailing slash** on `proxy_pass`, or nginx strips `/api` and FastAPI
404s:

```bash
# server
sudo mkdir -p /home/dokku/frontend/nginx.conf.d
sudo tee /home/dokku/frontend/nginx.conf.d/api.conf >/dev/null <<'EOF'
location /api/ {
    proxy_pass http://UPSTREAM;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass_request_headers on;
}
EOF
sudo chown dokku:dokku /home/dokku/frontend/nginx.conf.d/api.conf
sudo dokku proxy:build-config frontend
sudo dokku nginx:validate-config frontend
```

```bash
# laptop
curl -sS -D- http://DOMAIN/api/v1/health
# expect: HTTP 200  and  {"status":"ok"}
curl -sS -o /dev/null -w "%{http_code}\n" http://DOMAIN/
# expect: 200
```

---

## 12. HTTPS (Let's Encrypt) + force redirect

The app must already answer on port 80 for `DOMAIN` (steps 4, 10, 11).
Login will not work on plain HTTP: `ENVIRONMENT=production` marks the
session cookie `Secure`.

```bash
# server
sudo dokku letsencrypt:enable frontend
sudo dokku letsencrypt:list
ls /home/dokku/frontend/nginx.conf.d/api.conf
```

```bash
# laptop
curl -sS https://DOMAIN/api/v1/health
```

The single cert on the frontend covers `/` and `/api` (same server block).
The backend needs no cert.

---

## 13. Verify (project done-when)

```bash
# laptop
curl -sS https://DOMAIN/api/v1/health          # -> {"status":"ok"}
curl -sSI https://DOMAIN/                       # -> 200, text/html
```

Browser at `https://DOMAIN`:

1. Register.
2. Land on `/dashboard`.
3. Log food / weight / mood / sleep.
4. Reload — still signed in.
5. Charts; click a point → that day.
6. Settings: change display name.
7. Log out, log in.

If register “works” then dumps you on `/login`, the cookie never made it:
`/api` isn't proxied, or you're on `http`, or the request isn't same-origin.
`POST /api/v1/auth/register` should be the page host, status 201,
`Set-Cookie: session=…; HttpOnly; Secure; SameSite=Lax`.

---

## Redeploy / operate cheatsheet

```bash
# laptop
git push origin main              # GitHub, optional
git push dokku-backend main       # API + alembic predeploy
git push dokku-frontend main      # only if frontend changed

# server
sudo dokku run backend alembic upgrade head
sudo dokku run backend alembic current
sudo dokku logs backend -t
sudo dokku logs frontend -t
sudo dokku config:show backend
sudo dokku ps:restart backend
sudo dokku postgres:info healthdb
sudo dokku postgres:connect healthdb
```

The nginx snippet survives frontend rebuilds unless you delete
`/home/dokku/frontend/nginx.conf.d/api.conf`.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `git push` asks for a password / permission denied | Key not in `dokku ssh-keys:list`. `ssh SUDO_USER@…` works but `ssh dokku@… help` fails. |
| Push builds the wrong folder / no Dockerfile | `sudo dokku builder:report APP` — `build-dir` not set. |
| Backend boot: `Can't load plugin: sqlalchemy.dialects:postgres` | `DATABASE_URL` still `postgres://`. Redo the rewrite. |
| Backend boot: missing `SECRET_KEY` / `database_url` | `sudo dokku config:show backend`. |
| `alembic` predeploy fails | DB not linked, or URL rewrite broke host/user. `sudo dokku postgres:info healthdb`. |
| Frontend boots, `/api/v1/health` is a Qwik 404 | nginx snippet missing or `proxy_pass` has a trailing slash. |
| Login loop | Cookie not set/sent. Need HTTPS + `/api` proxy + `ENVIRONMENT=production`. |
| Let's Encrypt hangs / fails | DNS not here, Cloudflare orange cloud, port 80 closed, or app not deployed yet. |
| OOM during `git push` | `free -h` — swap off? Node build is fat. |
| Locked out after disabling root | `SUDO_USER` key never tested. Use Linode LISH to fix `authorized_keys`. |

---

## Ops: who's registered? (no admin UI yet)

There's no admin layer, so to see registered users just query Postgres
directly on the server. The service is `ikemen-db`.

```bash
sudo dokku postgres:connect ikemen-db
```

Then, at the psql prompt (`\q` to exit):

```sql
SELECT id, email, display_name, timezone, is_active, created_at
FROM users
ORDER BY created_at DESC;

SELECT count(*) FROM users;                    -- total registered
SELECT email, created_at FROM users            -- last 7 days
  WHERE created_at > now() - interval '7 days'
  ORDER BY created_at DESC;
```

Heads-up: the `1fe11a2c1211_seed_temporary_dev_user` migration seeds a
temporary dev user, so an unfamiliar account is probably that — filter it
out (or delete it) before real signups matter. A proper admin view is on
the future-features list.

---

## Simpler fallback if the `/api` nginx wiring fights you

Put the backend on its own subdomain instead of a path:

- `sudo dokku domains:set backend api.DOMAIN`, DNS `A api → SERVER_IP`,
  `sudo dokku letsencrypt:enable backend`.
- Rebuild the frontend with
  `--build-arg PUBLIC_API_BASE_URL=https://api.DOMAIN/api/v1`
  (`sudo dokku docker-options:add frontend build "--build-arg PUBLIC_API_BASE_URL=https://api.DOMAIN/api/v1"`
  then redeploy).
- Set backend `CORS_ORIGINS=https://DOMAIN` (now genuinely needed).
  `api.DOMAIN` and `DOMAIN` are the same site, so `SameSite=Lax` still works.

Skips custom nginx at the cost of a second cert + real CORS.

---

## What we are not doing

- Not putting this on the Rails Dokku box.
- Not `git init` in `backend/` or `frontend/`.
- Not an `api.` subdomain unless the path proxy fails (see fallback).
- Not setting `PUBLIC_API_BASE_URL` as a Dokku *runtime* env var.
- Not running the Linux box as root after step 2.
