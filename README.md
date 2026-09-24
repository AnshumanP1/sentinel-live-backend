# SentinelAPI live backend

Requires Node.js 24.15+ in the 24.x line. No external packages.

Copy `.env.example` to `.env`, replace all credential and domain placeholders, and choose a writable persistent `DATA_FILE`. Run:

```sh
node --env-file-if-exists=.env src/server.mjs
```

For local standalone use, change `APP_ENV` to `development`, set `DATA_FILE=data/sentinel.sqlite`, and allow your two local frontend origins. The complete bundle's `node dev.mjs` configures local development automatically.

Run checks with `node --test test/system.test.mjs`. The included `render.yaml` assumes this backend folder is your repository root and provisions a paid persistent-disk service when you choose to deploy it. Manual Render setup is explained in the deployment guide.

See the complete bundle's `docs/NETLIFY_DEPLOYMENT.md`, `docs/DEMO_AND_TESTING.md` and `docs/OPERATIONS.md`. These guides are also included in the backend archive under `docs/`.
