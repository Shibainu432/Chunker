FROM eclipse-temurin:17-jdk

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Fake Git Identity
RUN git config --global user.email "you@example.com" && \
    git config --global user.name "Your Name" && \
    git config --global --add safe.directory /app

# Initialize a fresh git repo to keep the build tasks happy
RUN git init && git add . && git commit -m "internal build" || true

# Fix line endings
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Build the app - setting version to 1.0.0
RUN ./gradlew build -x test --no-daemon -Pversion=1.0.0

# Verify where the jar is and rename it to something simple for the CMD to find
RUN find . -name "*.jar" && cp cli/build/libs/chunker-cli-1.0.0-all.jar /app/chunker.jar || cp cli/build/libs/chunker-cli-all.jar /app/chunker.jar

EXPOSE 10000

# Use the simplified filename we just created
CMD ["java", "-Xmx400m", "-jar", "/app/chunker.jar", "messenger"]
