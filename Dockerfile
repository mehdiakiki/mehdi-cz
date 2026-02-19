###############################
# Base deps layer (Yarn)
###############################
FROM node:20-alpine AS deps
WORKDIR /app

# Ensure yarn classic available (Node 20 image may already include yarn via corepack)
RUN if ! command -v yarn >/dev/null 2>&1; then corepack enable && corepack prepare yarn@1.22.22 --activate; else yarn --version; fi

# Copy only files needed to install dependencies
COPY package.json yarn.lock ./

# Install dependencies + sharp for production image optimization
RUN yarn install && yarn add sharp --ignore-engines

###############################
# Build layer
###############################
FROM node:20-alpine AS build
WORKDIR /app

# Activate yarn classic in build stage
RUN if ! command -v yarn >/dev/null 2>&1; then corepack enable && corepack prepare yarn@1.22.22 --activate; else yarn --version; fi

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

RUN yarn build

###############################
# Production runtime layer
###############################
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Activate yarn classic for runtime scripts
RUN if ! command -v yarn >/dev/null 2>&1; then corepack enable && corepack prepare yarn@1.22.22 --activate; else yarn --version; fi

# Non-root execution (optional hardening)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy required runtime artifacts
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY package.json yarn.lock ./
COPY --from=deps /app/node_modules ./node_modules

# Ensure nextjs user can write to .next/cache for image optimization
RUN chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["yarn", "serve"]
