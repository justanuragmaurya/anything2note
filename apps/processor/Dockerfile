# Processor service (plan.md §5.3): yt-dlp + ffmpeg behind a small HTTP server, run as a
# Cloudflare Container by apps/api (class Processor). Deploys must be linux/amd64.
FROM node:24-slim

ARG TARGETARCH
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Standalone yt-dlp build (no Python needed). It's fetched fresh on every image build, so a
# redeploy picks up YouTube fixes; the server also self-updates it on start.
RUN set -eux; \
  case "$TARGETARCH" in arm64) bin=yt-dlp_linux_aarch64 ;; *) bin=yt-dlp_linux ;; esac; \
  curl -fsSL -o /usr/local/bin/yt-dlp "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$bin"; \
  chmod a+rx /usr/local/bin/yt-dlp; \
  yt-dlp --version

WORKDIR /app
COPY src ./src
ENV PORT=8080 NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/server.ts"]
