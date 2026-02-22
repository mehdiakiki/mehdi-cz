# ==============================================================
# Stage 1: Build
# ==============================================================
FROM rust:1.77-slim-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock* ./

# Dependency caching trick.
RUN mkdir src && mkdir examples && \
    echo 'fn main() {}' > src/main.rs && \
    for i in 01 02 03 04 05 06 07 08; do \
        echo 'fn main() {}' > "examples/${i}_placeholder.rs"; \
    done && \
    cargo build --release 2>/dev/null || true && \
    rm -rf src examples

COPY src/ src/
COPY examples/ examples/
RUN touch src/main.rs && cargo build --release

# ==============================================================
# Stage 2: Minimal runtime
# ==============================================================
FROM debian:bookworm-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user.
RUN useradd --create-home --uid 1001 appuser

# Create the cache directory with correct permissions.
RUN mkdir -p /data && chown appuser:appuser /data

USER appuser
WORKDIR /home/appuser

COPY --from=builder /app/target/release/code-playground .

# The cache file persists across restarts via Docker volume.
ENV PORT=3001
ENV CACHE_PATH=/data/cache.json
ENV RUST_LOG=code_playground=info,tower_http=info
# PLAYGROUND_SECRET must be set at runtime — never bake into the image.
# ALLOWED_ORIGINS must be set to your domain.

EXPOSE 3001

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:3001/api/playground/health || exit 1

CMD ["./code-playground"]
