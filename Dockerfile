# RedStone Formations — Wiki.js fork (Requarks/wiki v2.5.314 + custom client)
# Build: docker build -t redstone-wiki:2.5-redstone --target release .
FROM node:24-alpine AS deps

RUN apk add --no-cache yarn g++ make cmake python3 git rsync

WORKDIR /wiki

COPY package.json yarn.lock ./
COPY patches ./patches

RUN --mount=type=cache,target=/root/.yarn \
    --mount=type=cache,target=/wiki/.yarn-cache \
    yarn --frozen-lockfile --non-interactive

COPY . .

# ====================
# --- Build Assets ---
# ====================
FROM deps AS assets

RUN --mount=type=cache,target=/root/.yarn \
    --mount=type=cache,target=/wiki/.yarn-cache \
    yarn build \
    && rm -rf node_modules \
    && yarn --production --frozen-lockfile --non-interactive \
    && yarn patch-package

# ===============
# --- Release ---
# ===============
FROM node:24-alpine AS release
LABEL maintainer="redstoneformations.fr"

RUN apk add --no-cache bash curl git openssh gnupg sqlite rsync \
  && mkdir -p /wiki /logs /wiki/data/content \
  && chown -R node:node /wiki /logs

WORKDIR /wiki

COPY --chown=node:node --from=assets /wiki/assets ./assets
COPY --chown=node:node --from=assets /wiki/node_modules ./node_modules
COPY --chown=node:node --from=assets /wiki/server ./server
COPY --chown=node:node --from=assets /wiki/dev/build/config.yml ./config.yml
COPY --chown=node:node --from=assets /wiki/package.json ./package.json
COPY --chown=node:node --from=assets /wiki/LICENSE ./LICENSE

USER node

VOLUME ["/wiki/data/content"]

EXPOSE 3000

CMD ["node", "--no-deprecation", "server"]
