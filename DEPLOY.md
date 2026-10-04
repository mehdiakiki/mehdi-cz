# Production release checklist

Pushing to `main` immediately builds and deploys the site image through `.github/workflows/docker.yml`. Do not push until the release is ready. The workflow updates only the `blog` container; it does not copy the Compose file to the VPS.

## Before the push

1. Review `git status --short` carefully and commit all intended new site files, content, fonts, images, `lib/` helpers, and the three `.yarn/patches/` files. This workspace may contain unrelated experiments, so do not blindly stage everything.
2. Run `yarn build` without `PERF_EXPERIMENT_IGNORE_TYPE_ERRORS`. The build generates content, runs the publication tests and the Flight gate, then builds the site.

## After the push

Wait for the GitHub Actions deploy and the Compose health check. Then smoke-test the homepage, a blog article, `/rust`, `/rust-failure-atlas`, the sitemap and the feed on the live site.
