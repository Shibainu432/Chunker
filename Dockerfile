# Use Node 20
FROM node:20

# Install Java
RUN apt-get update && apt-get install -y default-jre

# Set Workdir
WORKDIR /app

# Copy and Install
COPY . .
RUN npm install

# Build React
RUN CI=false npm run build

# Setup folders
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

# Launch
EXPOSE 10000
CMD ["node", "backend/server.js"]
