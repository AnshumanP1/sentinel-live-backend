FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN mkdir -p /var/data && chown node:node /var/data
USER node
ENV APP_ENV=production PORT=9080 DATA_FILE=/var/data/sentinel.sqlite
EXPOSE 9080
CMD ["node", "src/server.mjs"]
