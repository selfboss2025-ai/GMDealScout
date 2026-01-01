FROM node:20.19.6-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./
COPY tsconfig.json ./

# Installa dipendenze
RUN npm install

# Copia il resto del codice
COPY . .

# Compila TypeScript a JavaScript
RUN npm run build

# Espone la porta
EXPOSE 3000

# Avvia il bot compilato
CMD ["node", "dist/index.js"]