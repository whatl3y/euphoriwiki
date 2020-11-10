# Base image
FROM node:8

LABEL AUTHOR="Lance Whatley"

# specify working directory
WORKDIR /usr/euphoriwiki

# Install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install

# Copy the remainder of the source code and build everything
COPY . .
RUN npm run postinstall

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

CMD /wait && npm start
