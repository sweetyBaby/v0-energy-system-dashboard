# Docker deployment

This project uses Next.js standalone output, so it can run as a single Node.js container.
The backend address is injected at container startup through `API_BASE_URL`.

## 1. Prepare environment variables

Copy `.env.docker.example` to `.env.docker` and update the values:

```bash
APP_PORT=3000
API_BASE_URL=http://your-internal-api-host:8080
```

`API_BASE_URL` is a runtime variable. If the backend address changes, restart the container with the new value. You do not need to rebuild the image.

## 2. Build and run with Docker Compose

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

After startup, access the app from:

```text
http://<server-ip>:3000
```

## 3. Build and run with plain Docker

Build the image:

```bash
docker build -t energy-dashboard:latest .
```

Run the container:

```bash
docker run -d --name energy-dashboard -p 3000:3000 -e API_BASE_URL=http://your-internal-api-host:8080 --restart unless-stopped energy-dashboard:latest
```

## 4. Offline deployment to an internal server

If the internal server cannot access the internet, build the image on a machine that can access dependencies, then export and import it:

```bash
docker save -o energy-dashboard.tar energy-dashboard:latest
```

Copy `energy-dashboard.tar` to the internal server, then run:

```bash
docker load -i energy-dashboard.tar
docker run -d --name energy-dashboard -p 3000:3000 -e API_BASE_URL=http://your-internal-api-host:8080 --restart unless-stopped energy-dashboard:latest
```

## 5. Notes

- The container listens on port `3000`.
- If the backend also runs on the Docker host machine, do not use `localhost` unless you have configured host networking accordingly. Inside the container, `localhost` points to the container itself.
- The browser calls the Next.js app on the same origin, and Next.js proxies those requests to `API_BASE_URL` at runtime.
- If the company uses an Nginx reverse proxy, forward requests from port `80` or `443` to this container's `3000` port.
