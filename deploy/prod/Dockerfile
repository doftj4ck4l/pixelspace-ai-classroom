# Production image for the Pixelspace AI Classroom app (paic2).
#
# The app runs on hosts where the deploy user has docker but no root: the
# container carries the app, the host provides the docker socket (sandbox
# siblings for slide rendering) and the loopback services (Postgres, RustFS,
# the pi harness).

FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim
# pdftoppm renders slide previews from the PDF LibreOffice produces in the
# sandbox; the docker CLI itself is bind-mounted from the host.
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
