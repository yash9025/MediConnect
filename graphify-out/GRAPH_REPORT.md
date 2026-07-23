# Graph Report - C:\Users\YASH\Desktop\MediConnect  (2026-07-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 524 nodes · 905 edges · 54 communities (23 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5c12b8f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- App.jsx
- index.js
- medicalGraph.js
- adminRoute.js
- devDependencies
- assets/assets.js
- dependencies
- doctorRoute.js
- labController.js
- aiWorker.js
- backend/package.json
- fix-import-paths.mjs
- AiDiagnostic.jsx
- dependencies
- ingestData.js
- evals.js
- script.cjs
- ProtectedRoute.jsx
- researcherAgent.js
- lifestyleAgent.js
- admin/AppContext.jsx
- @langchain/community
- bullmq
- cloudinary
- cookie-parser
- cors
- dotenv
- express
- @google/generative-ai
- hnswlib-node
- @huggingface/inference
- ioredis
- jsonwebtoken
- langchain
- @langchain/core
- @langchain/google-genai
- @langchain/pinecone
- langsmith
- mongoose
- multer
- nodemailer
- nodemon
- pdf-parse
- @pinecone-database/pinecone
- razorpay
- resend
- socket.io
- socket.io-client
- @xenova/transformers
- zod

## God Nodes (most connected - your core abstractions)
1. `AppContext` - 22 edges
2. `connection` - 11 edges
3. `AdminContext` - 10 edges
4. `DoctorContext` - 10 edges
5. `MedicalChatBot()` - 10 edges
6. `calculateDoctorScore()` - 10 edges
7. `assets` - 9 edges
8. `getScoreBreakdown()` - 9 edges
9. `verifyToken()` - 8 edges
10. `analyzeReport()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `enqueueMedicalReport()`  [EXTRACTED]
  backend/scripts/test-phase4.js → backend/workers/aiQueue.js
- `seedDoctors()` --calls--> `connectDB()`  [EXTRACTED]
  backend/scripts/seedDoctors.js → backend/config/mongodb.js
- `markAppointmentPaid()` --calls--> `enqueueBookingSuccess()`  [EXTRACTED]
  backend/controllers/adminController.js → backend/workers/bookingSuccessQueue.js
- `markAppointmentPaid()` --calls--> `enqueueEmail()`  [EXTRACTED]
  backend/controllers/adminController.js → backend/workers/emailQueue.js
- `analyzeBloodReport()` --calls--> `enqueueMedicalReport()`  [EXTRACTED]
  backend/controllers/aiController.js → backend/workers/aiQueue.js

## Import Cycles
- None detected.

## Communities (54 total, 31 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.05
Nodes (47): connectCloudinary(), connectDB(), refreshToken(), deleteChatHistory(), getChatHistory(), saveChatMessage(), bookAppointment(), cancelAppointment() (+39 more)

### Community 1 - "App.jsx"
Cohesion: 0.09
Nodes (31): App(), assets, Navbar(), PanelLayout(), Sidebar(), LiveQueue(), parseSlotMinutes(), QueueChat() (+23 more)

### Community 2 - "index.js"
Cohesion: 0.09
Nodes (35): AIResponseDisplay(), DiagnosisCard(), DoctorCard(), formatFees(), EmptyState(), LifestyleAdviceCard(), ChatHeader, ChatTrigger (+27 more)

### Community 3 - "medicalGraph.js"
Cohesion: 0.08
Nodes (18): extractorSchema, llm, runExtractor(), GraphState, checkpointer, DOMAINS, graphBuilder, medicalGraph (+10 more)

### Community 4 - "adminRoute.js"
Cohesion: 0.12
Nodes (21): connection, addDoctor(), adminDashboard(), allDoctors(), appointmentAdmin(), appointmentCancel(), loginAdmin(), logoutAdmin() (+13 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (30): eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, @eslint/js (+22 more)

### Community 6 - "assets/assets.js"
Cohesion: 0.13
Nodes (15): assets, doctors, specialityData, Banner(), roleHomeMap, Footer(), Header(), MainLayout() (+7 more)

### Community 7 - "dependencies"
Cohesion: 0.08
Nodes (25): axios, framer-motion, dependencies, axios, framer-motion, jspdf, moment, react (+17 more)

### Community 8 - "doctorRoute.js"
Cohesion: 0.17
Nodes (19): getPendingReports(), requestVerification(), verifyReport(), appointmentCancel(), appointmentComplete(), appointmentsDoctor(), changeAvailability(), doctorDashboard() (+11 more)

### Community 9 - "labController.js"
Cohesion: 0.15
Nodes (17): emit(), formatNodeName(), getEndMessage(), getStartMessage(), streamAgentAnalysis(), analyzeReport(), CONFIG, embeddings (+9 more)

### Community 10 - "aiWorker.js"
Cohesion: 0.16
Nodes (11): redisPublisher, redisSubscriber, analyzeBloodReport(), runTests(), runTests(), PII_PATTERNS, rehydrateMedicalReport(), sanitizeMedicalReport() (+3 more)

### Community 11 - "backend/package.json"
Cohesion: 0.17
Nodes (11): author, description, license, main, name, scripts, server, start (+3 more)

### Community 12 - "fix-import-paths.mjs"
Cohesion: 0.22
Nodes (7): existsImportTarget(), exts, files, indexExts, projectRoot, srcRoot, tryResolve()

### Community 13 - "AiDiagnostic.jsx"
Cohesion: 0.27
Nodes (7): AGENT_CONFIG, AgentStatusBoard(), getConfig(), LogLine(), AiDiagnostic(), MODES, URGENCY

### Community 14 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, bcryptjs, @langchain/langgraph, uuid, validator, bcryptjs, @langchain/langgraph, uuid (+1 more)

### Community 15 - "ingestData.js"
Cohesion: 0.25
Nodes (7): args, buildMedicalIndex(), categorizeDocument(), CONFIG, __dirname, embeddings, __filename

### Community 16 - "evals.js"
Cohesion: 0.38
Nodes (6): evaluateContextPrecision(), evaluateFaithfulness(), genAI, goldenDataset, model, runEvals()

### Community 17 - "script.cjs"
Cohesion: 0.40
Nodes (3): files, fs, path

### Community 18 - "ProtectedRoute.jsx"
Cohesion: 0.60
Nodes (4): decodeJwtPayload(), getToken(), ProtectedRoute(), roleHomeMap

### Community 19 - "researcherAgent.js"
Cohesion: 0.67
Nodes (3): llm, mockQueryVectorDB(), runResearcher()

## Knowledge Gaps
- **149 isolated node(s):** `extractorSchema`, `llm`, `llm`, `checkpointer`, `graphBuilder` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `backend/package.json`, `@langchain/community`, `bullmq`, `cloudinary`, `cookie-parser`, `cors`, `dotenv`, `express`, `@google/generative-ai`, `hnswlib-node`, `@huggingface/inference`, `ioredis`, `jsonwebtoken`, `langchain`, `@langchain/core`, `@langchain/google-genai`, `@langchain/pinecone`, `langsmith`, `mongoose`, `multer`, `nodemailer`, `nodemon`, `pdf-parse`, `@pinecone-database/pinecone`, `razorpay`, `resend`, `socket.io`, `socket.io-client`, `@xenova/transformers`, `zod`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `connection` connect `adminRoute.js` to `server.js`, `labController.js`, `aiWorker.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `AppContext` connect `App.jsx` to `index.js`, `AiDiagnostic.jsx`, `assets/assets.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `extractorSchema`, `llm`, `llm` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05110809588421529 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08852459016393442 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09042553191489362 - nodes in this community are weakly interconnected._