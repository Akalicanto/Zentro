FROM node:24-bookworm-slim AS front
WORKDIR /source/Zentro.Front
COPY Zentro.Front/package*.json ./
RUN npm ci
COPY Zentro.Front/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS api
WORKDIR /source
COPY global.json Zentro.slnx ./
COPY Zentro.Api/Zentro.Api.csproj Zentro.Api/
RUN dotnet restore Zentro.Api/Zentro.Api.csproj
COPY Zentro.Api/ Zentro.Api/
COPY --from=front /source/Zentro.Front/dist/ Zentro.Front/dist/
RUN dotnet publish Zentro.Api/Zentro.Api.csproj -c Release --no-restore -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
WORKDIR /app
COPY --from=api /publish/ ./
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://127.0.0.1:5080 \
    Zentro__DatabasePath=/data/zentro.db \
    Zentro__BackupDirectory=/data/migration-backups
USER $APP_UID
ENTRYPOINT ["dotnet", "Zentro.Api.dll"]
