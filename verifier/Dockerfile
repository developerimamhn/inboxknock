# InboxKnock verifier. Used by the Vercel "verifier" service and by any Docker host.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

COPY package.json ./
COPY src ./src
COPY scripts ./scripts

# Bake the community disposable list into the image. The build still works if the download fails.
RUN node scripts/update-lists.ts || echo "Disposable list download failed, using the built-in list."
RUN mkdir -p /app/data && chown -R node:node /app/data

# The server listens on $PORT (set by the platform), 8787 when it is not set.
EXPOSE 8787
USER node
CMD ["node", "src/server.ts"]
