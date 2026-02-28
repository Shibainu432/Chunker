FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew build -x test
EXPOSE 8080
CMD ["java", "-Xmx512m", "-jar", "cli/build/libs/chunker-cli.jar", "messenger"]
