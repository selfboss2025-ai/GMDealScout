FROM node:20.19.6-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./
COPY tsconfig.json ./

# Installa dipendenze
RUN npm install

# Copia il resto del codice
COPY src ./src

# Compila TypeScript a JavaScript
RUN npm run build && ls -la dist/

# Rimuovi i file sorgente TypeScript per evitare confusione
RUN rm -rf src

# Espone la porta
EXPOSE 3000

# Avvia il bot compilato
CMD ["node", "dist/index.js"]