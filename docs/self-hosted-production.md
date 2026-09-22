# Self-hosted production Docker

This runbook starts the Nango server, PostgreSQL, and Redis as one Compose
project. It is deliberately project-scoped: Compose generates container names
from the project name, so two checkouts can run without colliding on
`nango-db`, `nango-redis`, or `nango-server`.

## 1. Prepare a clean project

Use a dedicated directory and copy the configuration template:

```sh
cp .env.example .env
openssl rand -base64 32
```

Set `NANGO_ENCRYPTION_KEY`, a strong database password, dashboard credentials,
and public HTTPS URLs in `.env`. Set `NANGO_IMAGE` to the approved immutable
Nango image tag or digest. The default is the published hosted image; an
unrelated image such as `hello` is not a valid Nango runtime.

For multiple checkouts, give each one a different `NANGO_DATA_DIR`,
`SERVER_PORT`, `CONNECT_UI_PORT`, and `COMPOSE_PROJECT_NAME`:

```sh
export COMPOSE_PROJECT_NAME=nango-production
export NANGO_DATA_DIR=/srv/nango-production/postgres
```

## 2. Render and start

Run these commands from the repository root:

```sh
docker compose config --quiet
docker compose up -d
```

The server waits for both PostgreSQL and Redis health checks. The database and
Redis ports bind to localhost by default; only the HTTP and Connect UI ports
are published for ingress.

## 3. Verify the deployment

```sh
docker compose ps
curl --fail --silent --show-error http://localhost:3003/ready
curl --fail --silent --show-error http://localhost:3003/health
docker compose exec nango-db pg_isready -U "${POSTGRES_USER:-nango}" -d "${POSTGRES_DB:-nango}"
docker compose exec nango-redis redis-cli ping
```

If readiness fails, inspect the service-specific logs without hiding the
original error:

```sh
docker compose logs --no-color nango-db nango-redis nango-server
```

## 4. Safe cleanup and replacement

Stop only this Compose project:

```sh
docker compose down
```

Do not use `docker system prune`, wildcard image deletion, or `down --volumes`
on a production project. Those commands can delete unrelated projects or
PostgreSQL data. Back up `NANGO_DATA_DIR` before changing the PostgreSQL major
version or replacing the data directory.

To remove an obsolete Nango project after confirming its project name and
backup, run `docker compose down` from that exact checkout. Remove an old image
only by its exact repository and digest after confirming no running container
uses it.

## 5. Image/build distinction

The self-hosted Compose file consumes `NANGO_IMAGE`. The repository
`scripts/build_docker.sh` builds `nangohq/nango:<git-hash>`, which is a separate
artifact and must be selected explicitly:

```sh
NANGO_IMAGE=nangohq/nango:<git-hash> docker compose up -d
```

Never silently substitute a local test image. Validate the selected image
contains the Nango server and exposes `/ready` and `/health` before rollout.
