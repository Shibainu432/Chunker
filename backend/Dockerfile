# Use a lightweight version of Java + Node
FROM eclipse-temurin:17-jre

# Install Node.js (needed to run server.js)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything from your backend folder into the container
COPY . .

# Ensure the JAR is executable
RUN chmod +x /app/chunker.jar

# We already created the package.json, so we just install the needs
RUN npm install

EXPOSE 10000

# Start the server
CMD ["node", "server.js"]
