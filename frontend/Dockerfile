# build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_GITHUB_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
RUN npm run build

# development stage
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV VITE_API_BASE_URL=http://backend:5001
EXPOSE 5173
CMD ["npm", "run", "dev"]

# production stage (EC2/docker-compose — SSL handled by the outer nginx container)
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ecs-production stage — SSL terminated by ALB; nginx proxies /api/* to localhost:5001
FROM nginx:alpine AS ecs-production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-ecs.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
