FROM node:20.19.6-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm install

# Copia il resto del codice
COPY . .

# Compila TypeScript
RUN npm run build

# Espone la porta (anche se il bot non la usa)
EXPOSE 3000

# Avvia il bot compilato
CMD ["npm", "start"]