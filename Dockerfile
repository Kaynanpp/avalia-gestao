FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME=Avalia Gestão
ARG NEXT_PUBLIC_COMPANY_BRAND=generic
ARG NEXT_PUBLIC_COMPANY_NAME=Sua empresa

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR=$NEXT_PUBLIC_USE_FIREBASE_EMULATOR \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_COMPANY_BRAND=$NEXT_PUBLIC_COMPANY_BRAND \
    NEXT_PUBLIC_COMPANY_NAME=$NEXT_PUBLIC_COMPANY_NAME

COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY next.config.js next-env.d.ts tsconfig.json tsconfig.seed.json tailwind.config.js postcss.config.js .eslintrc.json ./
RUN npm run build
COPY docs ./docs
COPY THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY LICENSE COPYRIGHT ./
RUN node scripts/third-party-notices.cjs linux-arm64 && \
    node scripts/firebase-copyright-notices.cjs && \
    node scripts/browser-notices.cjs && \
    node scripts/distribution-inventory.cjs

FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runner
WORKDIR /app
# Apply the two available Debian security updates found in the candidate scan.
RUN apt-get update && \
    apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 perl-base && \
    rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
COPY --from=builder --chown=node:node /app/LICENSE ./LICENSE
COPY --from=builder --chown=node:node /app/COPYRIGHT ./COPYRIGHT
COPY --from=builder --chown=node:node /app/docs/third-party ./docs/third-party
COPY --from=builder --chown=node:node /app/docs/supply-chain ./docs/supply-chain
COPY --from=builder --chown=node:node /app/docs/THIRD-PARTY-LICENSES.md ./docs/THIRD-PARTY-LICENSES.md
COPY --from=builder --chown=node:node /app/docs/DEPENDENCY-LICENSES.md ./docs/DEPENDENCY-LICENSES.md
RUN mkdir -p /app/docs/third-party/base-image && \
    dpkg-query -W -f='${Package}\t${Version}\t${source:Package}\t${source:Version}\t${Architecture}\n' > /app/docs/third-party/base-image/packages.tsv && \
    cp -aL /usr/share/doc /app/docs/third-party/base-image/debian-doc && \
    cp -aL /usr/share/common-licenses /app/docs/third-party/base-image/common-licenses && \
    if [ -f /usr/local/LICENSE ]; then cp /usr/local/LICENSE /app/docs/third-party/base-image/Node-LICENSE; fi && \
    cp /usr/local/lib/node_modules/npm/LICENSE /app/docs/third-party/base-image/npm-LICENSE
# Runtime scripts use node directly; package managers are not required by the app.
RUN rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v* && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg && \
    find /usr /bin /sbin -xdev -type f \( -perm -4000 -o -perm -2000 \) -exec chmod a-s '{}' \;
COPY --from=builder --chown=node:node /app/scripts/bootstrap-admin.cjs ./scripts/bootstrap-admin.cjs
COPY --from=builder --chown=node:node /app/scripts/migrate-production.cjs ./scripts/migrate-production.cjs
COPY --from=builder --chown=node:node /app/scripts/check-environment.cjs ./scripts/check-environment.cjs
COPY --from=builder --chown=node:node /app/scripts/portable-backup.cjs ./scripts/portable-backup.cjs

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
