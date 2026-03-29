# DocuMind

DocuMind is an AI-powered platform that allows users to **chat with documents and online content** using Retrieval-Augmented Generation (RAG).

Users can interact with **PDFs, websites, YouTube transcripts, and latest news articles**, enabling fast semantic search and contextual conversations over real-world content.

---

# Live Application

Frontend  
https://1documind.netlify.app

Backend API  
https://api.mindchuk.co.in

---

# Features

- Chat with uploaded **PDF documents**
- Chat with **website content**
- Chat with **YouTube video transcripts**
- Fetch and chat with **latest news articles**
- **Vector semantic search** using embeddings
- **Persistent chat history**
- **Secure authentication**

---

# How It Works

DocuMind uses a **Retrieval-Augmented Generation (RAG)** pipeline.

```
User Query
   ↓
Embedding Generation
   ↓
Vector Similarity Search (pgvector)
   ↓
Relevant Context Retrieval
   ↓
LLM Response Generation
```

Documents are chunked, embedded, stored in PostgreSQL, and retrieved using vector similarity search before generating answers.

---

# Latest News Feature

DocuMind can fetch and analyze current news articles.

Workflow:

1. **Google News RSS** is used to retrieve the latest article links quickly.
2. RSS is used because it is **very fast and lightweight**.
3. Some RSS article links cannot be reliably opened using standard scraping.
4. **Tavily API** is used to extract clean article content.

```
Google News RSS → fast article discovery
Tavily API      → reliable article extraction
```

The extracted article content is then used for chat.

Required environment variable:

```
TAVILY_API_KEY
```

---

# System Architecture

```
User
  ↓
Frontend (Netlify)
  ↓
Backend API
  ↓
Nginx Reverse Proxy
  ↓
Node.js Backend (Docker)
  ↓
PostgreSQL + pgvector
```

---

# Deployment Architecture

Backend runs on **AWS EC2 using Docker Compose**.

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

Persistence:

```
Database → Docker volume
Uploads  → EC2 filesystem
```

---

# Tech Stack

### Frontend
- React
- Vite
- TailwindCSS
- Netlify

### Backend
- Node.js
- Express
- Prisma

### Database
- PostgreSQL
- pgvector

### AI
- Gemini models
- Gemini embeddings

### Infrastructure
- Docker
- Docker Compose
- AWS EC2
- Nginx
- GitHub Actions

### External APIs
- Google News RSS
- Tavily API

---

# CI/CD Pipeline

Backend deployments are automated using **GitHub Actions**.

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

This updates the backend without affecting stored data.

---

# Security

The backend API is secured using **HTTPS with Let's Encrypt SSL certificates**.

```
https://api.mindchuk.co.in
```

Nginx also redirects HTTP traffic to HTTPS.

---

# Project Summary

DocuMind combines:

- **RAG-based AI retrieval**
- **vector similarity search**
- **multi-source content analysis**
- **automated cloud deployment**

to create a production-ready platform for interacting with documents and real-time web content.