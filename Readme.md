# DocuMind Deployment Architecture (Docker + GitHub Actions + EC2)

DocuMind uses **Docker, Docker Compose, GitHub Actions, AWS EC2, Nginx, and SSL/TLS** to build, deploy, and run the backend automatically while keeping the database and uploaded files persistent.

## Live Application

🌐 **Frontend (Netlify)**  
https://1documind.netlify.app

🔗 **Backend API (AWS EC2 + Nginx + SSL)**  
https://api.mindchuk.co.in/

---

# System Architecture

```
User
  ↓
Frontend (Netlify)
https://1documind.netlify.app
  ↓
Backend API
https://api.mindchuk.co.in
  ↓
Nginx Reverse Proxy
  ↓
Backend Docker Container (Node.js)
  ↓
PostgreSQL Container (pgvector)
```

---

# Backend Deployment Infrastructure

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

# Docker Containers

The system uses **Docker Compose** to manage two containers.

## PostgreSQL Container

Image:

```
pgvector/pgvector:pg15
```

Purpose:

- Stores application data
- Stores document chunks and embeddings
- Enables **vector similarity search using pgvector**

Database files persist inside Docker volume:

```
documind_postgres_data
```

Container path:

```
/var/lib/postgresql/data
```

---

## Backend Container

Image:

```
dhirajcodes123/documind-backend:latest
```

Built from the project **Dockerfile** and pushed to **DockerHub** through GitHub Actions.

Responsibilities:

- Node.js API server
- Authentication & JWT
- PDF upload processing
- Text chunk generation
- Embedding generation
- Communication with PostgreSQL

Internal backend port:

```
5000
```

---

# File Upload Persistence

Uploaded PDFs are stored using a **bind mount**.

Docker Compose mapping:

```
./uploads:/app/uploads
```

Meaning:

```
EC2 HOST                       CONTAINER
~/documind/backend/uploads →  /app/uploads
```

Therefore:

- Uploaded files remain stored on the EC2 filesystem
- Container redeployments **do not delete user files**

Server location:

```
~/documind/backend/uploads
```

---

# GitHub Actions CI/CD Pipeline

DocuMind uses **GitHub Actions** to automatically deploy the backend.

Deployment flow:

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

Commands executed on EC2:

```
docker-compose stop backend
docker-compose rm -f backend
docker system prune -af
docker-compose pull backend
docker-compose up -d backend
```

Result:

- Backend container updates automatically
- PostgreSQL container keeps running
- Uploaded files remain safe

---

# Backend Startup Process

When the backend container starts it runs:

```
npx prisma migrate deploy && npm start
```

Startup steps:

1. Apply pending Prisma migrations
2. Start Node.js server
3. Connect to PostgreSQL
4. API becomes available through Nginx at

```
https://api.mindchuk.co.in
```

---

# Advantages of This Architecture

- Automated deployments (CI/CD)
- Persistent database storage
- Persistent file uploads
- Containerized backend
- Secure HTTPS API
- Domain-based access via Nginx
- Easy reproducibility
- Production-style deployment architecture