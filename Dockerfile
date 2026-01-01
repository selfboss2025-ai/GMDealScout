FROM node:20.19.6-alpine

# Installa TypeScript globalmente
RUN npm install -g typescript ts-node

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm install

# Copia tutto il codice
COPY . .

# Espone la porta
EXPOSE 3000

# Avvia direttamente con ts-node
CMD ["ts-node", "src/index.ts"]