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

# Build the app
RUN ./gradlew build -x test --no-daemon

# Use the exact path found in the previous error log
RUN cp cli/build/libs/chunker-cli-1.13.0.jar /app/chunker.jar

EXPOSE 10000

# Use the simplified filename
CMD ["java", "-Xmx400m", "-jar", "/app/chunker.jar", "messenger"]
