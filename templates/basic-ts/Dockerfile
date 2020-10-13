FROM node:12-slim AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:12-slim
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
RUN npm cache clean --force
COPY --from=build /usr/src/app/lib lib

ENV NODE_ENV="production"
CMD [ "npm", "start" ]
