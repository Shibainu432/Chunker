FROM eclipse-temurin:17-jdk

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Fake Git Identity
RUN git config --global user.email "you@example.com" && \
    git config --global user.name "Your Name" && \
    git config --global --add safe.directory /app

# Initialize a fresh git repo
RUN git init && git add . && git commit -m "internal build" || true

# Fix line endings
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Build the app - Added 'clean' and skipped the Electron/App packaging 
# to focus only on the CLI jar we actually need.
RUN ./gradlew :cli:shadowJar :cli:jar --no-daemon

# Find the jar again (it might be 1.13.0 or 1.0.0 depending on the previous run)
RUN find cli/build/libs/ -name "*.jar" -exec cp {} /app/chunker.jar \;

EXPOSE 10000

# Use the simplified filename
CMD ["java", "-Xmx400m", "-jar", "/app/chunker.jar", "messenger"]
