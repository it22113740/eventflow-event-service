# eventflow-event-service

Event microservice for the **EventFlow** platform. Handles event CRUD, full-text search, and Swagger documentation. JWT validation is delegated to the User Service.

## Tech stack

| Concern | Library |
|---|---|
| Web framework | Express 4 |
| Database | MongoDB via Mongoose 8 |
| Validation | express-validator |
| HTTP client (inter-service) | axios |
| Logging | Winston |
| API docs | swagger-jsdoc + swagger-ui-express |
| Config | dotenv |

---

## Getting started

### 1. Local development

```bash
# 1. Copy env template and fill in values
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start in watch mode
npm run dev
```

The service starts on `http://localhost:3003` (override with `PORT`).

Swagger UI: `http://localhost:3003/api-docs`

### 2. Docker Compose

```bash
docker compose up --build
```

This starts:
- `event-service` on port `3003`
- `mongo` (MongoDB 7) on host port `27018`

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3003` | HTTP port |
| `NODE_ENV` | `development` | Node environment |
| `SERVICE_NAME` | `eventflow-event-service` | Name logged at startup |
| `MONGO_URI` | `mongodb://localhost:27017/eventflow-events` | MongoDB connection string |
| `USER_SERVICE_URL` | `http://user-service:5001` | Base URL of the User Service |
| `LOG_LEVEL` | `info` | Winston log level |

See `.env.example` for a complete template.

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | public | Health + DB status |
| `POST` | `/api/events` | organizer | Create event |
| `GET` | `/api/events` | public | List events (paginated) |
| `GET` | `/api/events/search?q=` | public | Search by title / category |
| `GET` | `/api/events/:id` | public | Get single event |
| `PUT` | `/api/events/:id` | authenticated | Update event (owner/admin) |
| `DELETE` | `/api/events/:id` | authenticated | Delete event (owner/admin) |

Full interactive documentation is available at `/api-docs`.

### Pagination

Append `?page=1&limit=10` to list / search endpoints. Maximum `limit` is 100.

### Authentication

Protected routes require:

```
Authorization: Bearer <JWT>
```

The JWT is validated by forwarding it to `USER_SERVICE_URL/api/users/profile`. The returned user profile is attached to `req.user`.

---

## Project structure

```
src/
├── config/
│   ├── logger.js       # Winston logger
│   └── swagger.js      # OpenAPI spec
├── controllers/
│   ├── event.controller.js
│   └── health.controller.js
├── middleware/
│   ├── auth.middleware.js     # JWT → user-service validation
│   ├── error.middleware.js    # Global error handler
│   └── validate.middleware.js # express-validator helper
├── models/
│   └── event.model.js
├── routes/
│   ├── event.routes.js  # Swagger JSDoc annotations live here
│   └── health.routes.js
└── index.js             # App entry point
```

---

## Docker

Multi-stage `Dockerfile` (node:20-alpine):

1. **deps** — installs production dependencies only
2. **production** — copies deps + source, runs as non-root `appuser`

```bash
# Build image manually
docker build -t eventflow-event-service .

# Run container
docker run -p 3003:3003 --env-file .env eventflow-event-service
```
