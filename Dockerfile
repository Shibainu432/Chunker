FROM eclipse-temurin:17-jdk

# Install Node.js and Git
RUN apt-get update && apt-get install -y git curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Initialize Git for Gradle
RUN git config --global user.email "loumencai@gmail.com" && \
    git config --global user.name "Your Name" && \
    git config --global --add safe.directory /app && \
    git init && git add . && git commit -m "build" || true

# Build Java CLI
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew && \
    ./gradlew :cli:shadowJar :cli:jar --no-daemon && \
    find cli/build/libs/ -name "*.jar" -exec cp {} /app/chunker.jar \;

# Install Express for our wrapper
RUN npm init -y && npm install express

EXPOSE 10000

# Run the wrapper instead of the Jar directly
CMD ["node", "server.js"]
