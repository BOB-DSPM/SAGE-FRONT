FROM node:18 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i '/^user[[:space:]]*nginx;/s/^/# /' /etc/nginx/nginx.conf \
    && sed -i '/^pid[[:space:]]/c pid /tmp/nginx.pid;' /etc/nginx/nginx.conf

# Give runtime directories to non-root nginx user
RUN mkdir -p /run/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run /run/nginx /etc/nginx/conf.d && \
    chmod +x /docker-entrypoint.sh

USER nginx

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
