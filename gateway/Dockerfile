FROM nginx:stable-alpine

# Copy the proxy configuration into the default nginx configuration directory
COPY nginx-gateway.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
