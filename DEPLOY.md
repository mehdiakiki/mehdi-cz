# Deployment Guide

## Important: NEXT_PUBLIC_ vars are baked into the Docker image at build time

Next.js inlines all `NEXT_PUBLIC_*` environment variables during `next build`. They are **not** read at runtime. This means:

- The Docker image must be **rebuilt** whenever you change any `NEXT_PUBLIC_*` value
- Runtime-only vars (like `BUTTONDOWN_API_KEY`) work fine as regular env vars

## Build and push a new image (from your local machine)

```bash
# 1. Make sure .env exists with all keys
#    Required build-time vars:
#      NEXT_PUBLIC_FORMSPREE_KEY
#      NEXT_PUBLIC_GISCUS_REPO
#      NEXT_PUBLIC_GISCUS_REPOSITORY_ID
#      NEXT_PUBLIC_GISCUS_CATEGORY
#      NEXT_PUBLIC_GISCUS_CATEGORY_ID
#    Required runtime vars:
#      BUTTONDOWN_API_KEY

# 2. Build the image (reads .env for build args via docker-compose)
docker-compose build

# 3. Tag and push to Docker Hub
docker tag mehdiakikisite_static_blog mast2133/mehdicz-site:latest
docker push mast2133/mehdicz-site:latest
```

## Deploy on the server

```bash
# 1. Pull the latest image
docker pull mast2133/mehdicz-site:latest

# 2. Stop the current container
docker stop mehdi-blog && docker rm mehdi-blog

# 3. Run the new container
docker run -d \
  --name mehdi-blog \
  --restart unless-stopped \
  -p 3000:3000 \
  -e BUTTONDOWN_API_KEY=<your-key> \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  mast2133/mehdicz-site:latest
```

Or if you have docker-compose on the server with a `.env` file:

```bash
docker pull mast2133/mehdicz-site:latest
docker-compose up -d
```

Note: If using `docker-compose up -d` on the server, set `image: mast2133/mehdicz-site:latest` in docker-compose.yml instead of the `build` block to skip rebuilding and just use the pre-built image.
