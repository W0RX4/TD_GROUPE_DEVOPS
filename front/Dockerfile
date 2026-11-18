# Variante non-root de nginx (écoute sur 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Adresse de l'API, surchargeable par variable d'environnement
ENV API_UPSTREAM=api:3000

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html app.js style.css /usr/share/nginx/html/

EXPOSE 8080
