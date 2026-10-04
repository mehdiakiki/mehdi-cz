# Production release checklist

Pushing to `main` immediately builds and deploys the site image through `.github/workflows/docker.yml`. Do not push until the release is ready. The workflow updates only the `blog` container; it does not copy the Compose file or build/update `code-playground` on the VPS.

## Before the push

1. Review `git status --short` carefully and commit all intended new site files, content, fonts, images, `lib/` helpers, and the three `.yarn/patches/` files. This workspace may contain unrelated experiments, so do not blindly stage everything.
2. Run `yarn build` without `PERF_EXPERIMENT_IGNORE_TYPE_ERRORS`. The build includes prebuild tests and the Flight gate. Check `docker compose config --quiet` with a real `PLAYGROUND_SECRET` configured.
3. Update `~/blog/docker-compose.yml` on the VPS to the reviewed repository version and put the **same**, randomly generated `PLAYGROUND_SECRET` in the VPS `.env` for both services. Keep `.env` private; never commit the secret. The site must be able to resolve `code-playground:3001` on `blog-network`.
4. Ensure `code-playground` exists and is healthy before pushing. The site deploy workflow now refuses to update `blog` if the VPS Compose configuration lacks the service or its health check is not healthy. If the playground is not already running, build and start it on the VPS from the reviewed `js_go_rust_playground/code-playground/` source and verify `docker compose ps` reports it healthy.

## Signature upgrade order

The site proxy sends both the new `X-Playground-Signature-V2` HMAC and a temporary legacy header. The updated backend accepts **only** V2. This permits a rolling upgrade:

- If the old playground backend is already healthy, deploy the site first, then rebuild/recreate `code-playground` from the new source. Verify example loading and execution after each step.
- If no playground backend exists, start the new backend first, then deploy the site. The site deployment preflight requires this.

Afterward, remove the temporary legacy header in a separate release. A previous site image that sends only the legacy header cannot execute against the new backend; a rollback of the site alone would require rolling the backend back too.

## After the push

Wait for the GitHub Actions deploy and both Compose health checks. Then smoke-test the homepage, a blog article, `/rust`, and playground example loading and execution on the live site. If the workflow fails its preflight, fix the VPS Compose/backend setup rather than bypassing the check.

The playground currently limits the site container's shared backend IP to 10 execute requests/minute because the Next.js proxy does not forward a verified visitor IP. Watch for 429s; per-visitor limits need an explicit trusted-proxy design before raising public traffic.
