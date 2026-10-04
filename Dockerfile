###############################
# Base deps layer (Yarn)
###############################
FROM node:24.20.0-alpine AS deps
WORKDIR /app

# Use the repository-pinned modern Yarn release.
RUN corepack enable && corepack prepare yarn@4.18.0 --activate

# Copy only files needed to install dependencies, including the reviewed
# compatibility patches referenced by the Yarn 4 lockfile.
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/patches ./.yarn/patches

# Install exactly the reviewed lockfile. `sharp` is a declared dependency.
RUN yarn install --immutable

###############################
# Build layer
###############################
FROM node:24.20.0-alpine AS build
WORKDIR /app

# Activate the same package-manager version used to generate the lockfile.
RUN corepack enable && corepack prepare yarn@4.18.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prevent Next.js telemetry in build containers
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_ vars must be present at build time (Next.js inlines them)
ARG NEXT_PUBLIC_FORMSPREE_KEY
ENV NEXT_PUBLIC_FORMSPREE_KEY=$NEXT_PUBLIC_FORMSPREE_KEY

ARG NEXT_PUBLIC_GISCUS_REPO
ENV NEXT_PUBLIC_GISCUS_REPO=$NEXT_PUBLIC_GISCUS_REPO
ARG NEXT_PUBLIC_GISCUS_REPOSITORY_ID
ENV NEXT_PUBLIC_GISCUS_REPOSITORY_ID=$NEXT_PUBLIC_GISCUS_REPOSITORY_ID
ARG NEXT_PUBLIC_GISCUS_CATEGORY
ENV NEXT_PUBLIC_GISCUS_CATEGORY=$NEXT_PUBLIC_GISCUS_CATEGORY
ARG NEXT_PUBLIC_GISCUS_CATEGORY_ID
ENV NEXT_PUBLIC_GISCUS_CATEGORY_ID=$NEXT_PUBLIC_GISCUS_CATEGORY_ID
ARG NEXT_UMAMI_ID
ENV NEXT_UMAMI_ID=$NEXT_UMAMI_ID

# A scheduled release has no source-code diff, so its build must not reuse a
# pre-publication Next.js layer from the Docker cache.
ARG PUBLICATION_BUILD_ID=local
ENV PUBLICATION_BUILD_ID=$PUBLICATION_BUILD_ID

RUN yarn build

###############################
# Production runtime layer
###############################
FROM node:24.20.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root execution (optional hardening)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy required runtime artifacts
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/lib/next-supported-browser-polyfills-webpack.js ./lib/
COPY --from=build /app/lib/next-supported-browser-polyfills.js ./lib/
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY package.json yarn.lock ./
COPY --from=deps /app/node_modules ./node_modules

# Ensure nextjs user can write to .next/cache for image optimization
RUN chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
