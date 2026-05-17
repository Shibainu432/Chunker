FROM node:20

# Install Java and Zip
RUN apt-get update && apt-get install -y \
openjdk-17-jre-headless \
zip wget && \
rm -rf /var/lib/apt/lists/*

# Set working directory to repo root
WORKDIR /app

# Copy the entire project
COPY . .

# 1. Build the Frontend
RUN cd app/ui && npm install && CI=false npm run build

# 2. Setup the Backend  
RUN cd backend && npm install

# 3. Download the Chunker CLI JAR
RUN wget -L --no-check-certificate \
    "https://github.com/HiveGamesOSS/Chunker/releases/download/1.17.0/chunker-cli-1.17.0.jar" \
    -O backend/chunker.jar && \
    echo "JAR size: $(wc -c < backend/chunker.jar) bytes" && \
    file backend/chunker.jar

# 4. Create upload directory
RUN mkdir -p backend/uploads && chmod 777 backend/uploads

EXPOSE 10000

# 5. Start the server
CMD ["node", "backend/server.js"]
