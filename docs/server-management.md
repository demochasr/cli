# Server Management

This document covers the CLI commands added for Dokploy remote server management and remote Docker Compose deployments.

## Auth

Use environment variables:

```bash
export DOKPLOY_URL="http://127.0.0.1:4580"
export DOKPLOY_AUTH_TOKEN="<dokploy_api_key>"
```

Or authenticate once:

```bash
dokploy authenticate -u http://127.0.0.1:4580 -t "<dokploy_api_key>"
```

## Server Commands

List all Dokploy servers, including remote deployment nodes:

```bash
dokploy server list
```

Show one server:

```bash
dokploy server info --serverId UB29AlAa71vGcHjUXXlKy
```

The output includes:
- `serverId`
- `name`
- `ipAddress:port`
- `username`
- `serverStatus`
- `serverType`
- `sshKeyId`

## Compose Commands

Show one compose service:

```bash
dokploy compose info --composeId MI0WNEUP-O2pwVsR1Qj8V
```

Deploy an existing compose service:

```bash
dokploy compose deploy --composeId MI0WNEUP-O2pwVsR1Qj8V --skipConfirm
```

Deploy with a custom title and description:

```bash
dokploy compose deploy \
  --composeId MI0WNEUP-O2pwVsR1Qj8V \
  --skipConfirm \
  --title "TURN proxy deploy" \
  --description "Deploy turn_proxy on remote node"
```

Update an existing compose service in raw mode:

```bash
dokploy compose update \
  --composeId MI0WNEUP-O2pwVsR1Qj8V \
  --sourceType raw \
  --composeFile ./docker-compose.yml \
  --envFile ./.env.turn
```

Update an existing compose service in GitHub mode:

```bash
dokploy compose update \
  --composeId MI0WNEUP-O2pwVsR1Qj8V \
  --sourceType github \
  --owner demochasr \
  --repository turn_proxy \
  --branch main \
  --githubId <dokploy_github_provider_id> \
  --composePath ./docker-compose.yml
```

Create a new raw compose service on a remote server:

```bash
dokploy compose create \
  --projectId 2oVkA49I9VeI6IoagNFzA \
  --environmentId env_prod_2oVkA49I9VeI6IoagNFzA_1759316698.450439 \
  --serverId UB29AlAa71vGcHjUXXlKy \
  --name turn-proxy-nectup-nuremberg-1 \
  --sourceType raw \
  --composeFile ./docker-compose.yml \
  --envFile ./.env.turn \
  --skipConfirm
```

Create a new GitHub-backed compose service on a remote server:

```bash
dokploy compose create \
  --projectId 2oVkA49I9VeI6IoagNFzA \
  --environmentId env_prod_2oVkA49I9VeI6IoagNFzA_1759316698.450439 \
  --serverId UB29AlAa71vGcHjUXXlKy \
  --name turn-proxy-nectup-nuremberg-1 \
  --sourceType github \
  --owner demochasr \
  --repository turn_proxy \
  --branch main \
  --githubId <dokploy_github_provider_id> \
  --composePath ./docker-compose.yml \
  --skipConfirm
```

## TURN Example

Example `.env.turn` for a TURN proxy on a Remnawave node:

```env
CONNECT_ADDR=host.docker.internal:2040
PROXY_ID=ee7c203e-b105-4515-be63-8f366e8c2b90
TURN_BOOTSTRAP_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n
TURN_BOOTSTRAP_SECRET=
TCP_MODE=true
```

`PROXY_ID` must be the Remnawave host UUID, not the Dokploy `serverId`.

## Notes

- `serverId` is the Dokploy remote server identifier.
- `PROXY_ID` for TURN is the Remnawave host UUID used by the backend bootstrap token.
- `compose create` creates the service first, then configures source settings.
- `github` mode requires an existing Dokploy GitHub provider ID.
- `raw` mode uploads the local compose file content into Dokploy.
