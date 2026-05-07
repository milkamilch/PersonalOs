FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY app.jar app.jar
VOLUME /app/data
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.datasource.url=jdbc:sqlite:/app/data/personalos.db"]
