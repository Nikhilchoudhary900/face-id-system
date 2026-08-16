# AI Face Identification System

A full-stack, AI-powered face identification and recognition system with real-time webcam identification, deep learning embeddings, an admin dashboard, audit logs and analytics.

## Highlights

- **Real-time identification** from a live webcam feed with on-screen bounding boxes and confidence scores
- **Deep learning models**: YuNet CNN for face detection + SFace CNN for 128-dimensional facial embeddings (both from OpenCV Zoo)
- **Automatic logging** of known and unknown persons with stable-identity deduplication
- **User management** — register users with multiple facial samples (webcam capture or photo upload), averaged embeddings, edit, activate/deactivate, delete
- **Image recognition** — upload any photo and identify every face in it
- **Dashboard & analytics** — live stats, 24h activity, daily trends, department distribution, top identified users
- **Audit logs** — filterable, with saved frames for unknown detections and CSV export
- **JWT authentication** for the admin console
- **Configurable** similarity threshold and logging behaviour

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5, vanilla CSS |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI / CV | OpenCV (YuNet + SFace ONNX models), NumPy |
| Data | SQLAlchemy ORM + SQLite (switch to MySQL/PostgreSQL via `DATABASE_URL`) |
| Auth | JWT (python-jose), bcrypt (passlib) |

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + startup
│   │   ├── config.py          # settings / paths
│   │   ├── database.py        # SQLAlchemy engine/session
│   │   ├── models.py          # Admin, User, RecognitionLog, Setting
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── auth.py            # JWT + password hashing
│   │   ├── face_service.py    # face detection + embedding engine
│   │   ├── registration.py    # embedding DB matching
│   │   ├── settings_service.py
│   │   └── routes/            # auth, users, recognition, logs, stats, settings
│   ├── models/                # YuNet + SFace ONNX models
│   ├── static/                # uploads, photos, log frames, sample image
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/             # Login, Dashboard, LiveRecognition, UploadRecognition, Users, RegisterUser, Logs, Reports, Settings
│   │   ├── components/        # Layout, FaceCapture, charts
│   │   ├── api.js             # API client with JWT handling
│   │   ├── auth.jsx           # auth context
│   │   └── webcam.js          # camera capture + overlay helpers
│   └── vite.config.js         # dev proxy /api -> :8000
└── start.sh                   # starts backend + frontend
```

## Setup & Run

### 1. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

> Requires Python 3.9+. On Linux, the OpenCV models work out of the box — no GPU or TensorFlow needed.

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Run both servers

```bash
./start.sh
```

Or run them separately:

```bash
# terminal 1 — backend on :8000
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# terminal 2 — frontend on :5173 (proxies /api to backend)
cd frontend && npm run dev
```

Open **http://localhost:5173**.

### Default admin account

```
Username: admin
Password: admin123
```

Change the password by replacing the bcrypt hash in the database, or set a custom `SECRET_KEY` environment variable.

## Usage Guide

1. **Log in** with the admin credentials.
2. **Register users** (Users → Register User): fill in details, capture at least 3 facial samples via webcam or upload photos, save. The system extracts an embedding from each sample and stores the averaged vector.
3. **Live Recognition** (Live Recognition): start the camera. Registered people are identified in real time with confidence; unknown faces are flagged and (optionally) logged.
4. **Image Recognition** (Image Recognition): upload a group photo or single image to identify all detected faces.
5. **Logs & Reports**: browse the recognition audit trail, filter, export CSV, and view analytics.
6. **Settings**: adjust the similarity threshold, logging behaviour, mirror mode, and seed demo data.

### Demo data

In **Settings → Demo Data** you can:

- `Seed Demo Users` — creates 5 sample profiles; the first one (Alice Johnson) is pre-registered with a real facial embedding using the bundled sample image, so recognition works out of the box.
- `Seed Demo Logs` — generates 15 days of synthetic recognition history for the dashboard/reports.
- `Clear All Logs` — wipes the recognition log.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login → JWT |
| GET | `/api/auth/me` | Current admin |
| GET/POST | `/api/users` | List / create users |
| PUT/DELETE | `/api/users/{id}` | Update / delete user |
| POST | `/api/users/{id}/faces` | Register facial samples (averaged embedding) |
| GET | `/api/users/{id}/photo` | User photo |
| POST | `/api/recognize` | Identify faces in an uploaded image |
| POST | `/api/recognition/frame` | Identify faces in a webcam frame (with logging) |
| GET | `/api/logs` | Paginated, filterable recognition logs |
| GET | `/api/logs/export` | CSV export |
| GET | `/api/stats/overview` | Dashboard statistics |
| GET | `/api/stats/reports` | Daily/hourly/top analytics |
| GET/PUT | `/api/settings` | Read / update system settings |

## Recognition Pipeline

1. **Detect** — YuNet returns bounding boxes + facial landmarks for all faces.
2. **Align & embed** — SFace aligns each face (112×112) and produces a normalized 128-d embedding.
3. **Compare** — cosine similarity against every registered embedding.
4. **Decide** — best similarity above the configurable threshold → identified; otherwise → Unknown.
5. **Log** — stable identities are recorded with timestamp, confidence, source and (for unknowns) a saved frame.

## Configuration (environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///backend/data/faceid.db` | SQLAlchemy URL (MySQL/PostgreSQL supported) |
| `SECRET_KEY` | `change-me-...` | JWT signing key |
| `TOKEN_EXPIRE_MINUTES` | `480` | JWT lifetime |
| `FACE_THRESHOLD` | `0.50` | Default recognition threshold |
| `AUTO_LOG_UNKNOWN` | `true` | Log unknown faces by default |

## Cloud Deployment

The repo ships with a `Dockerfile` (multi-stage: builds the React app, then runs FastAPI which serves both the API and the built frontend from one service) and a `render.yaml` blueprint. No GPU required.

### Option A — Render (easiest)

1. Push this repo to GitHub/GitLab.
2. In Render: **New → Blueprint**, select the repo.
3. Render reads `render.yaml` automatically and deploys a web service (Docker).
4. Open the generated URL — the app is served over HTTPS, so **live webcam works in any browser**.
5. Set a strong `SECRET_KEY` in the service's environment variables.

### Option B — Railway / Fly.io (Docker)

Railway:

```bash
# install CLI, then from the project root
railway login
railway up
```

Fly.io:

```bash
fly launch --dockerfile Dockerfile
fly deploy
```

### Option C — AWS

- **Elastic Beanstalk (simplest):** choose "Docker" platform, upload a zip of the repo, deploy.
- **ECS / EC2:** build the image with `docker build -t face-id .`, push to ECR, run the container. Put it behind an Application Load Balancer.
- **Important for webcam:** browsers require HTTPS for `getUserMedia`. Use an ALB with an ACM certificate (or CloudFront) so the app is served over HTTPS.

### Option D — Any VPS (e.g. DigitalOcean droplet)

```bash
docker build -t face-id .
docker run -d -p 8000:8000 -e SECRET_KEY='<random>' --name faceid face-id
```

### Production notes

| Concern | Detail |
|---------|--------|
| Persistence | SQLite stores data in `backend/data/`. On ephemeral hosts (Render free/Starter, Railway) the disk resets on deploy — enable the managed DB in `render.yaml` (`DATABASE_URL`) for persistence. |
| Camera / HTTPS | Live Recognition needs HTTPS (any cloud URL qualifies). Without it, only Image Recognition works. |
| Scale | Inference is CPU-bound; scale vertically (more RAM/CPU) or use the REST endpoints from external clients. |
| Default login | `admin` / `admin123` — change it in Settings → Administrator Account immediately after deploying. |

## Notes

- Real-time inference runs on CPU (~3 frames/sec); faster on GPU-enabled hosts.
- Camera access requires HTTPS or localhost (browser security). The preview environment provides an HTTPS URL.
- The bundled sample image (`backend/static/samples/lena.jpg`) is the classic OpenCV test image, used only to seed demo data.
# face-id-system
