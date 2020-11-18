FROM node:13.12.0-alpine
WORKDIR /usr/local/src
COPY package*.json ./
COPY . .
RUN npm install
EXPOSE 9000
CMD ["npm", "start"]
