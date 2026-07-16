# MediConnect — Low Level Architecture Explanation

> **Diagram file:** [LLD_Architecture.html](file:///C:/Users/YASH/.gemini/antigravity-ide/brain/0ca66a33-0852-484b-952d-fec07df811b1/LLD_Architecture.html) — open in any browser, drag to pan, Ctrl+Wheel or +/- to zoom.

---

## Layer-by-Layer Breakdown

### ① Client Layer  `Blue`

| Service | Role |
|---|---|
| **Web App** | React + Vite SPA, Tailwind CSS. Entry point for all users. |
| **Patient Portal** | Booking, AI report upload, health history, queue tracking. |
| **Doctor Portal** | Schedule manager, OPD live queue, spam control, prescriptions. |
| **Admin Panel** | Doctor CRUD, platform-wide analytics. |
| **Socket.IO Client** | Persistent WS connection — receives OPD queue ETAs and real-time AI pipeline progress events (`ai-progress`). |

---

### ② Edge Layer  `Purple`

| Service | Role |
|---|---|
| **CDN (Cloudflare)** | Caches and serves static JS/CSS bundles, DDoS protection. |
| **API Gateway (Render)** | Node.js + Express on port 4000, routes all `/api/*` traffic. |
| **Auth Middleware** | `authUser / authAdmin / authDoctor` — verifies JWT, enforces RBAC role guards before any business logic. |
| **Upload Gate** | Multer multipart handler — temp disk storage for PDFs before forwarding to Cloudinary. |
| **WS Gateway** | Socket.IO server — upgrades HTTP → WS, manages rooms (`job_{id}`, `doctor_{id}`, `admin_global_queue_room`). |

---

### ③ Backend Services  `Pink`

Each service has exactly **one responsibility**. No service shares a controller.

| Service | Owner File | What it does |
|---|---|---|
| **Auth & User Service** | `userController.js` | register, login, profile CRUD |
| **Appointment Service** | `userController.js` + `doctorController.js` | book, cancel, list, FIFO token assignment |
| **Payment Service** | `userController.js` | Razorpay order create + HMAC verify |
| **Lab / Report Service** | `labController.js` | PDF → Cloudinary → Gemini extract → RAG → diagnosis → doctor match → MongoDB save |
| **Agent Service** | `agentController.js` | Enqueues job into `ai-analysis-queue` for heavy LangGraph pipeline |
| **Chat Service** | `chatController.js` | In-session conversational AI with Gemini + RAG context |
| **Admin Service** | `adminController.js` | Doctor CRUD, slot/availability management |
| **Queue & Notify** | `server.js` Socket.IO handlers | Rolling ETA algorithm, bidirectional OPD queue chat, anti-spam blockedPatients |

---

### ④ Async Processing  `Cyan`

All slow operations are offloaded to BullMQ so the HTTP response returns instantly.

| Queue | Worker | Why Async? |
|---|---|---|
| `booking-queue` | `bookingWorker.js` | Prevents race conditions on slot booking; rollback on failure |
| `booking-success-queue` | `bookingWorker.js` | Idempotent payment confirm (duplicate webhook protection) |
| `email-queue` | `emailWorker.js` | Email delivery is slow and non-critical to the request path |
| `ai-analysis-queue` | `aiWorker.js` | LangGraph + Gemini can take 30–90 seconds — must not block HTTP |

**Redis Pub/Sub WS Bridge** — `psubscribe("job_updates_*")` → `pmessage` → `io.to("job_{id}").emit("ai-progress")`. This decouples the AI worker process from the Socket.IO server.

**RAG Cache** — `rag_cache:{sha256(query)}` with 7-day TTL avoids repeated Pinecone vector searches for identical medical queries.

---

### ⑤ AI Pipeline  `Orange`

> Only `Lab/Report Service` and `Agent Service` may write to this pipeline. No other service has arrows in.

#### LangGraph Multi-Agent Graph (`medicalGraph.js`)

```
PDF Upload
    ↓
Extractor Agent     (Gemini 2.5 Flash → structured JSON: test_name, value, status)
    ↓
Triage Agent        (Conditional: isValidBloodReport? → triage | END)
    ↓
┌───────────────────────────────────────────────────┐
│  PARALLEL FAN-OUT (requiredSpecialists from state) │
│  Cardiology · Hematology · Pulmonology             │
│  Endocrinology · Nephrology · Gastroenterology     │
│  Dermatology · Infectious Disease · General Med    │
└───────────────────────────────────────────────────┘
    ↓ (fan-in to synthesizer)
Synthesizer Agent   (hallucination retry loop, max 3x, MemorySaver checkpointer)
    ↓
PII Rehydrator      (restore masked tokens from local piiMap)
    ↓
MongoDB (report saved) → Socket.IO "COMPLETED" event → Client
```

#### RAG Pipeline (`labController.js`)

```
Abnormal Labs + User Symptoms
    ↓
Query Expander (Gemini → 50-word medical search string)
    ↓
Redis Cache CHECK (sha256 hash key, 7d TTL)
    ↓ (cache miss)
HuggingFace Embedder (all-mpnet-base-v2)
    ↓
Pinecone similarity search (k=8, threshold=0.35)
    ↓
Redis Cache SET (7d TTL)
    ↓
Diagnosis Generator (Gemini + MoHFW context, traceable() via LangSmith)
```

---

### ⑥ Data Layer  `Green`

**Ownership table — each DB owned by specific services only:**

| Store | Owner Services |
|---|---|
| **MongoDB / users** | Auth & User Service |
| **MongoDB / doctors** | Admin Service, Appointment Service, Lab/Report Service (distinct query) |
| **MongoDB / appointments** | Appointment Service, Booking Workers |
| **MongoDB / reports** | Lab/Report Service, Agent Service |
| **MongoDB / chats** | Chat Service |
| **MongoDB / queueChats** | Queue & Notify (Socket.IO handler) |
| **Cloudinary** | Lab/Report Service only |
| **Pinecone** | Lab/Report Service only (via `getVectorStore()` singleton) |
| **Redis** | All BullMQ workers + RAG cache + Pub/Sub bridge |
| **LangGraph MemorySaver** | AI Worker only |

---

### ⑦ Third-Party Services  `Gray`

| Service | Connected By | Why |
|---|---|---|
| **Razorpay** | Payment Service | Secure payment orders + HMAC webhook verification |
| **Google Gemini API** | Lab Service, AI Workers, Chat Service | Medical reasoning, structured extraction, diagnosis |
| **HuggingFace API** | Lab Service (RAG) | Sentence embeddings for Pinecone vector search |
| **Email Provider (Nodemailer/Resend)** | Email Worker | Async appointment confirmation + diagnosis emails |
| **LangSmith** | Lab Service | AI call tracing, token usage, eval dashboard |
| **Render.com** | Infrastructure | PaaS hosting, auto-deploy, health-check integration |

---

### ⑧ Monitoring & Observability  `Yellow`

| Signal | Implementation | Coverage |
|---|---|---|
| **Logging** | Express global error middleware + `console.error` | Uncaught exceptions with stack traces |
| **Queue Metrics** | BullMQ `worker.on('completed' / 'failed' / 'error')` | Per-queue job success/failure rates |
| **Health Probe** | `GET /ping → {status, timestamp, uptime}` | Render.com auto-restart trigger |
| **LangSmith Traces** | `traceable()` on `processPdf` + `generateDiagnosis` | Token usage, latency, prompt/response capture |
| **Real-time Progress** | Redis Pub/Sub → Socket.IO `ai-progress` events | Stage-by-stage AI pipeline visibility in UI |
| **Graceful Shutdown** | `process.on('SIGTERM', 'SIGINT')` → `server.close()` | Clean drain before process exit |

---

## Connection Rationale

| Arrow | Why it exists |
|---|---|
| Payment Service → Razorpay | Only service that handles financial transactions |
| Lab Service → Cloudinary | Only service that stores medical PDFs |
| Lab Service → Pinecone | Only service that does RAG retrieval |
| AI Worker → Redis Pub/Sub | Decouples AI process from WS server; enables horizontal scaling |
| Booking Worker → MongoDB | Idempotent appointment creation with slot rollback |
| Email Worker → Email Provider | Fire-and-forget, non-blocking confirmation emails |
| Redis Pub/Sub → Socket.IO | Bridge between worker process and real-time client connection |

---

## Architecture Improvement Recommendations

> [!IMPORTANT]
> These are production upgrades recommended for scaling MediConnect beyond its current architecture.

| # | Improvement | Rationale |
|---|---|---|
| 1 | **Persistent Redis LangGraph Checkpointer** | Replace `MemorySaver` with `RedisCheckpointer` — survives process restarts, enables true durable AI pipeline execution |
| 2 | **Rate Limiting at Edge** | Add `express-rate-limit` or Cloudflare rate rules on `/api/lab` and `/api/agent` — AI calls are expensive and open to abuse |
| 3 | **Redis Stack for True Semantic Caching** | Upgrade from SHA256 hash cache to `FT.SEARCH` with vector similarity — cache hits for semantically similar (not just identical) queries |
| 4 | **Background Webhook Worker** | Move Razorpay webhook processing from HTTP handler into `paymentWorker.js` — prevents timeout on slow payment confirmation |
| 5 | **Separate AI Worker Process** | Run `aiWorker.js` as an independent Node process (or containerized Lambda) — prevents AI CPU/memory spikes from impacting the main HTTP server |
| 6 | **Structured Logging (Pino/Winston)** | Replace `console.error` with structured JSON logs → forward to Datadog/Grafana Loki for searchable production logs |
| 7 | **API versioning** | Prefix all routes with `/api/v1/` — enables non-breaking future API evolution |
| 8 | **Distributed Tracing (OpenTelemetry)** | Add OTel spans across HTTP → BullMQ → AI Agent → DB — end-to-end trace correlation beyond just LangSmith |
| 9 | **Doctor Availability Lock (Optimistic Concurrency)** | Use MongoDB `findOneAndUpdate` with `$push` + version field instead of read-then-write — prevents double-booking under high concurrency |
| 10 | **LangGraph Researcher + Lifestyle Agents** | `researcherAgent.js` and `lifestyleAgent.js` exist in the codebase but are not wired into `medicalGraph.js` — connecting them would enrich the pipeline output |
