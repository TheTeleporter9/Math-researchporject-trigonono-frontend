# Build from the repository root (not from backend-spring alone):
#   docker build -f backend-spring/Dockerfile .

FROM node:20-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /backend-spring
COPY backend-spring/pom.xml ./
COPY backend-spring/src ./src
# So ${project.basedir}/../frontend/dist resolves to /frontend/dist during mvn package
COPY --from=frontend /src/dist /frontend/dist
RUN mvn -q -DskipTests -Pembed-frontend package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /backend-spring/target/trigonaut-spring-0.1.0.jar /app/app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
