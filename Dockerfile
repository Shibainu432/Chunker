FROM eclipse-temurin:17-jdk

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Fake Git Identity (fixes Exit 128)
RUN git config --global user.email "you@example.com" && \
    git config --global user.name "Your Name" && \
    git config --global --add safe.directory /app

# Initialize a fresh git repo inside the container if one isn't found
# This prevents the ":cli:jar" task from failing when it looks for a version
RUN git init && git add . && git commit -m "internal build" || true

# Fix line endings
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Build the app - added -Pversion=1.0.0 to bypass git versioning
RUN ./gradlew build -x test --no-daemon -Pversion=1.0.0

EXPOSE 10000

# Path for the Chunker jar
CMD ["java", "-Xmx400m", "-jar", "cli/build/libs/chunker-cli-all.jar", "messenger"]
