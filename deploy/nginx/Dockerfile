FROM nginx:alpine

# Remove default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create upload mount directory
RUN mkdir -p /var/www/uploads

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
