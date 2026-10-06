# The backend (ntbd) as a container. Build from the repository root, which has the shared widget
# catalog the backend packages: docker build -f deploy/backend.Dockerfile .

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY shared shared
COPY ntbd/pom.xml ntbd/pom.xml
RUN mvn -q -f ntbd/pom.xml dependency:go-offline
COPY ntbd/src ntbd/src
RUN mvn -q -f ntbd/pom.xml package -DskipTests

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --home /app ntbd
WORKDIR /app
COPY --from=build /build/ntbd/target/ntbd-*.jar app.jar
USER ntbd
ENV SPRING_PROFILES_ACTIVE=staging
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
