FROM node:20.19.6-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze incluso ts-node
RUN npm install

# Copia il resto del codice
COPY . .

# Espone la porta (anche se il bot non la usa)
EXPOSE 3000

# Avvia il bot con ts-node
CMD ["npx", "ts-node", "src/index.ts"]