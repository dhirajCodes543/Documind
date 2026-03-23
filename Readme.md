# DocuMind Deployment Architecture (Docker + GitHub Actions + EC2)

DocuMind uses **Docker, Docker Compose, GitHub Actions, AWS EC2, Nginx, and SSL/TLS** to build, deploy, and run the backend automatically while keeping the database and uploaded files persistent.

🔗 **Public API Endpoint**

https://api.mindchuk.co.in/

---

# 1. System Overview

The backend runs on an **AWS EC2 server** using Docker containers.

Server structure:

```
EC2 SERVER
│
├── documind/backend
│   ├── docker-compose.yml
│   ├── .env
│   └── uploads/
│
├── containers
│   ├── documind-postgres
│   └── documind-backend
│
└── docker volume
    └── documind_postgres_data
```

---

# 2. Docker Containers

The system uses **Docker Compose** to manage two containers.

## PostgreSQL Container

Image:

```
pgvector/pgvector:pg15
```

Purpose:

- Stores application data
- Stores document chunks and embeddings
- Enables **vector search using pgvector**

Features:

- Uses a **Docker volume** for persistence
- Automatically restarts if the server restarts

Database files are stored in:

```
documind_postgres_data
```

Inside container:

```
/var/lib/postgresql/data
```

---

## Backend Container

Image:

```
dhirajcodes123/documind-backend:latest
```

Built using the project **Dockerfile** and pushed to **DockerHub** through GitHub Actions.

Responsibilities:

- Node.js API server
- Authentication and JWT handling
- PDF upload processing
- Chunk generation
- Embedding generation
- Communication with PostgreSQL

Internal backend port:

```
5000
```

---

# 3. File Upload Persistence

Uploaded PDFs are stored using a **bind mount**.

Docker Compose mapping:

```
./uploads:/app/uploads
```

Meaning:

```
EC2 HOST                       CONTAINER
~/documind/backend/uploads  →  /app/uploads
```

Therefore:

- Files uploaded by users are stored directly on the EC2 filesystem
- Restarting or redeploying containers **does not delete uploaded files**

Actual location on server:

```
~/documind/backend/uploads
```

---

# 4. Database Persistence

PostgreSQL data is stored using a **Docker volume**.

Configuration:

```
documind_postgres_data:/var/lib/postgresql/data
```

This ensures:

- Database data survives container restarts
- Database data survives container recreation
- Data remains safe during deployments

---

# 5. GitHub Actions CI/CD Pipeline

DocuMind uses **GitHub Actions** to automate backend deployments.

Workflow:

```
Push Code
   ↓
Build Docker Image
   ↓
Push Image to DockerHub
   ↓
SSH into EC2
   ↓
Pull latest image
   ↓
Restart backend container
```

Deployment commands executed on EC2:

```
docker-compose stop backend
docker-compose rm -f backend
docker system prune -af
docker-compose pull backend
docker-compose up -d backend
```

Result:

- Backend container is replaced with the newest version
- PostgreSQL container remains running
- Uploaded files remain intact

---

# 6. Backend Startup Process

When the backend container starts it runs:

```
npx prisma migrate deploy && npm start
```

Steps:

1. Prisma applies pending migrations
2. Node.js server starts
3. Backend connects to PostgreSQL
4. API becomes available on port **5000**

---

# 7. Domain + Nginx Reverse Proxy

The backend is exposed through **Nginx as a reverse proxy**.

Architecture flow:

```
Client
   ↓
https://api.mindchuk.co.in
   ↓
Nginx Reverse Proxy
   ↓
http://localhost:5000
   ↓
DocuMind Backend Container
```

Nginx responsibilities:

- Accept incoming HTTP/HTTPS traffic
- Handle SSL termination
- Forward requests to the backend container
- Hide internal ports from public internet

---

# 8. SSL / TLS Security

The API is secured using **SSL/TLS certificates**.

Secure endpoint:

```
https://api.mindchuk.co.in/
```

Example request:

```
https://api.mindchuk.co.in/api/endpoint
```

Benefits:

- Encrypted communication
- Secure API requests
- Production-ready HTTPS setup

---

# 9. Deployment Flow

```
Developer pushes code
        ↓
GitHub Actions builds Docker image
        ↓
Image pushed to DockerHub
        ↓
EC2 pulls latest backend image
        ↓
Old backend container removed
        ↓
New backend container started
        ↓
Backend reconnects to existing PostgreSQL
        ↓
API available at https://api.mindchuk.co.in
```

---

# 10. Persistence Summary

Persisted components:

```
Database → Docker Volume
Uploads → EC2 filesystem
```

Non-persisted components:

```
Backend container
Old Docker images
```

Containers can be recreated anytime **without losing user data**.

---

# 11. Advantages of This Setup

This architecture provides:

- Automated deployments (CI/CD)
- Persistent database storage
- Persistent file uploads
- Containerized backend
- Secure HTTPS API
- Domain-based access via Nginx
- Reproducible infrastructure
- Safe deployments without downtime

This setup follows a **production-style architecture used in real backend systems**.