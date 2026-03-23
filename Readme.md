# DocuMind Deployment Architecture (Docker + GitHub Actions + EC2)

DocuMind uses **Docker, Docker Compose, GitHub Actions, AWS EC2, Nginx, a custom domain, and SSL/TLS** to build, deploy, and run the backend automatically while keeping the database and uploaded files persistent.

## Live Application

🌐 **Frontend (Netlify)**  
https://1documind.netlify.app

🔗 **Backend API (AWS EC2 + Nginx + SSL)**  
https://api.mindchuk.co.in/

---

# 1. System Overview

The system consists of:

- **Frontend deployed on Netlify**
- **Backend deployed on AWS EC2**
- **PostgreSQL with pgvector running in Docker**
- **Nginx reverse proxy for routing traffic**
- **SSL/TLS for secure HTTPS communication**
- **GitHub Actions CI/CD for backend deployments**

High-level architecture:

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

# 2. Backend Deployment Infrastructure

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

Explanation:

- `docker-compose.yml` defines the backend and PostgreSQL services
- `.env` stores environment variables such as database URL, JWT secret, and API keys
- `uploads/` stores user-uploaded PDF files on the EC2 filesystem
- `documind_postgres_data` is a Docker volume used to persist PostgreSQL data

---

# 3. Docker Containers

The system uses **Docker Compose** to manage two containers.

## PostgreSQL Container

Image:

```
pgvector/pgvector:pg15
```

Purpose:

- Stores application data
- Stores document metadata, chat data, chunks, and embeddings
- Enables **vector similarity search using pgvector**

Database persistence:

```
documind_postgres_data
```

Database path inside the container:

```
/var/lib/postgresql/data
```

Important note:

- PostgreSQL data is persisted using a **Docker volume**
- Even if the Postgres container is restarted or recreated, the database remains safe

---

## Backend Container

Image:

```
dhirajcodes123/documind-backend:latest
```

This image is built from the project **Dockerfile** and pushed to **DockerHub** through GitHub Actions.

Responsibilities:

- Runs the Node.js API server
- Handles authentication and JWT logic
- Processes uploaded PDFs
- Creates chunks
- Generates embeddings
- Communicates with PostgreSQL
- Serves API endpoints consumed by the frontend

Internal backend port:

```
5000
```

The backend is not accessed directly by users through EC2 IP and port in normal use. Instead, Nginx routes traffic from the domain to this internal backend service.

---

# 4. File Upload Persistence

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

- Uploaded files are stored directly on the EC2 filesystem
- Backend container redeployments **do not delete uploaded files**
- User documents remain safe even when the backend container is recreated

Actual location on the server:

```
~/documind/backend/uploads
```

---

# 5. Database Persistence

PostgreSQL data is persisted using a **Docker volume**.

Configuration:

```
documind_postgres_data:/var/lib/postgresql/data
```

This ensures:

- Database survives container restarts
- Database survives container recreation
- Data remains intact across deployments

Persistence summary:

```
Database → Docker volume
Uploads  → EC2 filesystem
```

---

# 6. GitHub Actions CI/CD Pipeline

DocuMind uses **GitHub Actions** to automatically deploy backend changes.

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
Pull latest backend image
   ↓
Restart backend container
```

Commands executed on EC2 during deployment:

```bash
docker-compose stop backend
docker-compose rm -f backend
docker system prune -af
docker-compose pull backend
docker-compose up -d backend
```

Result:

- Backend container is updated automatically
- PostgreSQL container keeps running
- Uploaded files remain safe
- Database remains safe

Important detail:

- GitHub Actions does **not** create or modify `docker-compose.yml`
- The compose file already exists on EC2
- GitHub Actions only pulls the latest backend image and restarts the backend container

---

# 7. Backend Startup Process

When the backend container starts, it runs:

```bash
npx prisma migrate deploy && npm start
```

Startup sequence:

1. Apply pending Prisma migrations
2. Start the Node.js server
3. Connect to PostgreSQL
4. Serve the API on internal port `5000`

After that, Nginx forwards incoming requests from the public domain to the backend.

---

# 8. Domain Setup

A custom domain was configured for the backend API:

```
api.mindchuk.co.in
```

DNS was pointed to the EC2 public IP using an **A record**.

Example idea:

```
Type: A
Name: api
Value: <EC2_PUBLIC_IP>
```

This means requests for:

```
https://api.mindchuk.co.in
```

are sent to the EC2 server.

---

# 9. Nginx Reverse Proxy

Nginx is installed on the EC2 server and acts as a **reverse proxy**.

Instead of exposing the backend directly as:

```
http://EC2_PUBLIC_IP:5000
```

users access the backend through:

```
https://api.mindchuk.co.in
```

Nginx flow:

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

Responsibilities of Nginx:

- Accept incoming web traffic
- Route requests from the domain to the backend
- Hide internal backend port from users
- Work with SSL/TLS certificates
- Redirect HTTP requests to HTTPS

This makes the deployment more professional, secure, and production-like.

---

# 10. SSL / TLS Security

The backend API is secured using **SSL/TLS certificates**.

Secure public endpoint:

```
https://api.mindchuk.co.in/
```

Why HTTPS is important:

- Encrypts communication between browser and server
- Protects tokens, credentials, and API traffic
- Prevents data from being read in plain text over the network
- Makes the API production-ready

Without HTTPS, traffic would be plain HTTP and could be intercepted more easily.

---

# 11. How SSL Certificate Was Added

After buying the domain and pointing DNS to EC2, Nginx was configured and a certificate was generated using **Certbot / Let's Encrypt**.

Typical process:

1. Install Nginx
2. Configure Nginx server block for `api.mindchuk.co.in`
3. Point domain DNS to EC2
4. Run Certbot
5. Certbot verifies ownership of the domain
6. SSL certificate is issued
7. Nginx is automatically updated to use HTTPS

Conceptually, the certificate files are stored on the server and Nginx uses them to serve secure HTTPS traffic.

So the request flow becomes:

```
Browser
  ↓
HTTPS request
  ↓
Nginx handles SSL/TLS
  ↓
Nginx forwards request to backend on localhost:5000
  ↓
Backend processes request
```

---

# 12. HTTP to HTTPS Redirection

Nginx also redirects insecure HTTP traffic to HTTPS.

Meaning:

```
http://api.mindchuk.co.in
```

automatically becomes:

```
https://api.mindchuk.co.in
```

This ensures all traffic is secure.

---

# 13. Complete Request Flow

Full production request flow:

```
User
  ↓
Frontend (Netlify)
https://1documind.netlify.app
  ↓
API call to backend
https://api.mindchuk.co.in
  ↓
DNS resolves domain to EC2 public IP
  ↓
Nginx receives request on EC2
  ↓
SSL/TLS secures the connection
  ↓
Nginx forwards request to backend on port 5000
  ↓
Backend container handles request
  ↓
Backend queries PostgreSQL container
  ↓
Response sent back to user
```

---

# 14. Persistence Summary

Persisted components:

```
Database → Docker Volume
Uploads  → EC2 Filesystem
```

Non-persisted components:

```
Backend container
Old Docker images
```

This means containers can be recreated anytime **without losing user data**.

---

# 15. Advantages of This Architecture

This setup provides:

- Automated backend deployments with GitHub Actions
- Containerized backend with Docker
- Persistent PostgreSQL storage
- Persistent file upload storage
- Secure HTTPS API using SSL/TLS
- Clean domain-based API access
- Reverse proxy setup with Nginx
- Safer production-style backend deployment
- Easy reproducibility and maintenance

---

# 16. Final Summary

DocuMind uses a modern deployment flow where:

- the **frontend** is hosted on **Netlify**
- the **backend** runs in Docker on **AWS EC2**
- **PostgreSQL + pgvector** stores data and embeddings
- **GitHub Actions** automates backend deployments
- **Nginx** routes traffic from the domain to the backend
- **SSL/TLS** secures the API over HTTPS
- **uploads and database data remain persistent** across deployments

This creates a simple but solid **production-style full-stack deployment architecture**.