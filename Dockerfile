# Base image
FROM node:14

LABEL AUTHOR="Lance Whatley"

# specify working directory
WORKDIR /usr/euphoriwiki

# Install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install

# Copy the remainder of the source code and build everything
COPY . .
RUN npm run build

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

CMD /wait && npm start
