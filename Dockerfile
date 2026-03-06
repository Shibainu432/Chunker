# 1. Base Image
FROM node:20

# 2. Install Java 17 for the Chunker JAR
RUN apt-get update && apt-get install -y default-jre && rm -rf /var/lib/apt/lists/*

# 3. Setup App Directory
WORKDIR /app

# 4. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 5. Copy all project files
COPY . .

# 6. Build the React frontend
# CI=false prevents minor warnings from stopping the build
RUN CI=false npm run build

# 7. Create required folders for uploads
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

# 8. Define Port and Start Command
EXPOSE 10000
CMD ["node", "backend/server.js"]
