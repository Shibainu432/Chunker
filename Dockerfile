FROM eclipse-temurin:17-jdk

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# --- NEW LINE BELOW TO FIX EXIT VALUE 128 ---
RUN git config --global --add safe.directory /app

# Fix line endings
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Build the app
RUN ./gradlew build -x test --no-daemon

EXPOSE 10000

# Path for the Chunker jar
CMD ["java", "-Xmx400m", "-jar", "cli/build/libs/chunker-cli-all.jar", "messenger"]
