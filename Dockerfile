# Usamos una imagen oficial de Node.js que garantiza la versión compatible
FROM node:22-slim AS builder

WORKDIR /app

# Instalamos dependencias
COPY package*.json ./
RUN npm install

# Copiamos el código y construimos la app
COPY . .
RUN npm run build

# Etapa de ejecución (Runtime) - mantiene la imagen pequeña
FROM node:22-slim

WORKDIR /app

# Copiamos solo lo necesario desde la etapa de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Instalamos solo dependencias de producción
RUN npm install --omit=dev

# Configuramos el puerto y el comando de inicio
EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

CMD ["npm", "run", "serve:ssr:landing-page"]
