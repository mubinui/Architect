# Architect

CI/CD is configured with GitHub Actions for this monorepo:

- CI on pull requests and pushes to `main` for:
	- `backend` (dependency install, smoke checks, optional tests)
	- `frontend` (Angular build)
- CD for frontend to GitHub Pages.
- Optional backend CD through a deploy hook secret.

## Workflows

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-pages.yml`
- `.github/workflows/deploy-backend-hook.yml`

## Frontend Deployment (GitHub Pages)

1. In GitHub, go to repository settings.
2. Open `Settings -> Pages`.
3. Ensure `Build and deployment` source is `GitHub Actions`.
4. Push to `main` to trigger deployment.

The frontend deploy URL will be:

- `https://mubinui.github.io/Architect/`

## Optional Backend Deployment (Free Tier Hosts)

Use a host that supports deploy hooks (for example Render, Railway, or similar plans available to you).

1. Create your backend service on the host.
2. Copy the deploy hook URL from the hosting dashboard.
3. In GitHub, add repository secret:
	 - `BACKEND_DEPLOY_HOOK_URL` = your deploy hook URL
4. Push any changes under `backend/` to trigger backend redeploy.

If the secret is not set, the backend deploy workflow exits cleanly.
