Volumes are Docker's mechanism for persisting and sharing data between the host
machine and containers, or between containers. By default, container filesystems
are ephemeral (data is lost when the container is removed). Volumes solve this
by providing persistent storage that exists outside the container lifecycle.

# Three Types of Volume

## 1. Bind Mount: `./local:/container`

- Mounts host directory into container.
- Host content **overwrites** container content.
- Use case: Development, for hot reloading.
- It should start by "./".

```yaml
volumes:
  - ./frontend:/app # Local code visible in container (not a copy)
```

## 2. Named Volume: `volume_name:/container`

- Docker-managed persistent storage.
- Survives container deletion.
- Use case: Databases, persistent data.

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

## 3. Anonymous Volume: `/container/path`

- Protects specific path from parent bind mount
- It creates an anonymous volume using the data in the container image in the
  specific path.
- It gets deleted once the image is deleted.
- Use case: Isolating `node_modules` from host

```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules # Keeps container dependencies
```

### Why Isolate `node_modules`?

Native binaries compiled for macOS will not run in Linux containers. We can use
anonymous volume to preserve Linux-compiled dependencies inside container while
mounting source code from host.

```yaml
frontend:
  volumes:
    - ./frontend:/app # Source code (node_modules is inside this folder too)
    - /app/node_modules # "Overwriting" container dependencies (Linux)
  environment:
    - CHOKIDAR_USEPOLLING=true # Enable file watching
```
