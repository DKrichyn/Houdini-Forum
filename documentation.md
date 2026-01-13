# USOF — Detailed Documentation (CBL Stages + Program Algorithm)

> **Focus of this document** — to describe in detail:  
> 1) progress after each completed CBL stage;  
> 2) the complete algorithm of how the entire system works (end-to-end flow).

The project consists of two major parts:
- **Backend**: Node.js (Express) + MySQL. Key files include:  
  `src/server.js`, `src/storage/schema.sql`, `src/storage/db.js`,  
  `src/services/{authService, mailService, ratingService}.js`,  
  `src/web/middlewares/auth.js`, `src/web/routes/{auth,posts,users,admin}.routes.js`,  
  `src/docs/openapi-usof.yaml` (API contract).
- **Frontend**: React + Redux + React Router. Main files/pages:  
  `src/pages/PostDetailsPage.jsx`, components displaying dates using  
  `toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', ... })`.

---

## 1) Full Program Algorithm (End-to-End)

Below is the “life cycle” of a request/action, from UI to database and back.

### A. System Initialization
1. **Backend startup** (`server.js`):
   - Initializes Express app, adds middleware (JSON parser, CORS, static assets, error handlers).
   - Connects to MySQL using a connection pool (`storage/db.js`).
   - **Schema setup:** executes `schema.sql` during bootstrap (creates `Users`, `Posts`, `Comments`, `Likes`, `Tokens`, etc.).
   - Registers routes: `/api/auth`, `/api/users`, `/api/posts`, `/api/admin`, `/api/docs` (Swagger UI).
2. **Frontend startup** (React SPA):
   - Sets up routes: `/`, `/login`, `/register`, `/posts`, `/posts/:id`, `/profile`, etc.
   - Initializes Redux store and restores session from `localStorage` (JWT token).

### B. Authentication & Authorization
1. **Registration** (`POST /api/auth/register`):
   - Validates input (Joi schemas in `validationSchemas.js`).
   - Hashes password with `bcryptjs`.
   - Creates a new record in `Users`.
   - Optionally sends confirmation email (`mailService.js`).
2. **Login** (`POST /api/auth/login`):
   - Verifies login and password.
   - Generates a **JWT** with payload (user ID, role).
   - Returns `{ token }`, stored in Redux + `localStorage`.
3. **Protected access:**
   - Client sends `Authorization: Bearer <token>`.
   - Middleware `auth.js`:
     - Verifies token.
     - Injects `req.user` (id, role).
     - Optionally restricts access (`requireRole('admin')`).

### C. Posts, Comments, and Likes
1. **Post CRUD** (`/api/posts`):
   - `GET /api/posts` — list posts with pagination/filters.
   - `POST /api/posts` — create post (requires auth).
   - `GET /api/posts/:id` — get post details.
   - `PATCH /api/posts/:id` — edit (owner/admin).
   - `DELETE /api/posts/:id` — delete (owner/admin).
2. **Comments** (`/api/posts/:id/comments` or `/api/comments`):
   - `POST` — add comment.
   - `GET` — list comments for a post.
   - `PATCH/DELETE` — edit/delete by author or admin.
3. **Likes/Dislikes** (`/api/likes`):
   - `POST` — add like/dislike for target (`target_type='post'|'comment'`, `target_id`).
   - Updates counters (`likes_count`, `dislikes_count`) and records in `Likes`.

### D. User Rating (Business Logic)
- **Concept:** user rating = total (likes=+1, dislikes=−1) across all posts and comments.
- Implemented in `services/ratingService.js` via SQL aggregation:
  ```sql
  SELECT COALESCE(SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END),0)
  FROM Likes l
  JOIN Posts p ON l.target_type='post' AND l.target_id=p.id
  WHERE p.author_id = ?;
  ```
  and
  ```sql
  SELECT COALESCE(SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END),0)
  FROM Likes l
  JOIN Comments c ON l.target_type='comment' AND l.target_id=c.id
  WHERE c.author_id = ?;
  ```
- The combined score updates the `Users.rating` column.
- Triggered after each like/dislike or moderation action.

> If a user has “2 dislikes” but a rating of “−20,” the likely causes are:  
> a) frontend scales the value visually, b) duplicate likes in DB, or c) an outdated weighted scoring system.

### E. Rendering and Data Flow on Frontend
- Backend responds in JSON.
- Redux updates state → React re-renders.
- Dates formatted with **`uk-UA`** locale and **`Europe/Kyiv`** timezone:
  ```js
  new Date(createdAt).toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
  ```
- Example page `PostDetailsPage`:
  - Fetches post and comments.
  - Displays author, body, likes.
  - Event handlers trigger REST actions; backend recalculates rating, Redux refreshes UI.

---

## 2) Detailed CBL Stage Progress

Each stage below describes **goals, activities, artifacts, decisions, testing, and completion criteria**.

### Stage 1 — **Engage**
- **Goal:** define the core challenge and project vision.  
  Create a platform where users share posts, interact via likes/comments, and build a reputation system.
- **Activities:**
  - Analyzed similar platforms (StackOverflow, Reddit).
  - Outlined domain model: User, Post, Comment, Like, Role, Token.
- **Artifacts:**
  - Early ER diagram of DB.
  - Rough wireframes for frontend (feed, details, login, profile).
- **Decisions:**
  - **Tech stack:** Node.js + Express + MySQL; React + Redux + Router.
  - **Auth method:** JWT (simple and SPA-friendly).
- **Verification:**
  - Documented reputation and like rules.
  - Defined admin/user roles.
- **Completion Criteria:**
  - Challenge and MVP scope approved.
  - Core architecture and technologies fixed.

---

### Stage 2 — **Investigate**
- **Goal:** confirm feasibility and plan architecture.
- **Activities:**
  - Designed `schema.sql` (tables, keys, constraints).
  - Drafted API (`openapi-usof.yaml`): `/auth`, `/users`, `/posts`, `/comments`, `/likes`.
  - Analyzed localization/timezone handling (`Europe/Kyiv`).
- **Artifacts:**
  - DB Schema:
    - `Users`, `Posts`, `Comments`, `Likes`, `Tokens`, `Favorites`.
  - API Schemas & Joi Validators (`validationSchemas.js`).
- **Decisions:**
  - Likes stored as rows in `Likes` table.
  - Counters in `Posts`/`Comments` for faster feed rendering.
  - Rating recalculated in service (not DB trigger).
- **Verification:**
  - ER model validated via test seed data.
  - Swagger UI matches routes.
- **Completion Criteria:**
  - Schema and API specs complete, validated, and documented.

---

### Stage 3 — **Prototype**
- **Goal:** implement the happy-path MVP — register, login, create, view posts.
- **Activities:**
  - Built `/api/auth/register`, `/api/auth/login`, `/api/posts` endpoints.
  - Added Redux slices: `auth`, `posts`.
  - Implemented date formatting and localization.
- **Artifacts:**
  - Functional SPA with working CRUD for posts.
  - Temporary stubs for comments/likes.
- **Decisions:**
  - Unified error response `{ error: "..." }`.
  - JWT stored in `localStorage` for MVP.
- **Verification:**
  - Manual test: Register → Login → Create post → View post → Read details.
- **Completion Criteria:**
  - Prototype demonstrates the entire user flow end-to-end.

---

### Stage 4 — **Build**
- **Goal:** complete all functional modules — comments, likes, ratings, profiles, admin tools.
- **Activities:**
  - Added comment routes, like routes, profile updates, avatar uploads.
  - Implemented `ratingService.recomputeUserRating(userId)` integration.
  - Extended Redux with async thunks for each CRUD operation.
  - Added middleware validation, error handling.
- **Artifacts:**
  - Full CRUD workflows, avatar uploads, Swagger API matching actual backend.
- **Decisions:**
  - **RBAC:** `auth()` + `requireRole('admin')` middleware.
  - Pagination and field selection in queries.
  - Unique constraint on `(user_id, target_type, target_id)` in `Likes`.
- **Verification:**
  - Integration tests covering all CRUD and rating recalculations.
- **Completion Criteria:**
  - MVP feature set implemented and tested manually.

---

### Stage 5 — **Evaluate**
- **Goal:** test, verify correctness, and optimize UX.
- **Activities:**
  - Created test cases:
    - Like/dislike toggling.
    - Rating consistency.
    - Access control enforcement.
    - Date rendering accuracy.
  - Improved UX: loaders, error toasts, disabled buttons during requests.
  - Monitored API response times (<400ms avg).
- **Artifacts:**
  - QA test checklist, fixed validation issues.
- **Decisions:**
  - Added DB indexes (`Likes(target_type, target_id)`, etc.).
  - Centralized error logging on server/client.
- **Verification:**
  - Debugged rating miscalculation (2 dislikes = −2).
  - Unique index added, validated rating correctness.
- **Completion Criteria:**
  - All critical bugs resolved; app ready for demonstration.

---

### Stage 6 — **Reflect**
- **Strengths:**
  - Clear separation of concerns: services (backend), thunks (frontend).
  - Strong API contract (OpenAPI) simplifies collaboration.
  - Denormalized counters improve performance.
- **Areas for Improvement:**
  - Add automated tests (unit + e2e).
  - Offload rating recalculation to a worker/queue.
  - Use `HttpOnly` cookies for JWT in production.
  - Implement moderation/flagging and weighted rating.
- **Outcome:**
  - MVP ready for deployment, roadmap for further growth defined.
- **Completion Criteria:**
  - Documentation (this file) finalized and matches implementation.

---

## Appendix — Core Mechanisms

### User Rating (SQL Logic)
- **Aggregate posts and comments likes:**
  ```sql
  SELECT COALESCE(SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END), 0)
  FROM Likes l
  JOIN Posts p ON l.target_type='post' AND l.target_id = p.id
  WHERE p.author_id = ?;

  SELECT COALESCE(SUM(CASE WHEN l.type='like' THEN 1 ELSE -1 END), 0)
  FROM Likes l
  JOIN Comments c ON l.target_type='comment' AND l.target_id = c.id
  WHERE c.author_id = ?;

  UPDATE Users SET rating = ? WHERE id = ?;
  ```
- **Consistency Rules:**
  - Unique key on `(user_id, target_type, target_id)` in `Likes`.
  - Toggle behavior prevents duplicates.
  - Integration tests ensure rating = Σ(likes)−Σ(dislikes).

### Timezones and Display
- **Server:** stores UTC timestamps.
- **Client:** renders `Europe/Kyiv` timezone with `uk-UA` locale.
- **Note:** “+2 hours” offset is normal daylight saving shift — not a bug.

---

## API Overview (MVP)

| Category | Endpoints | Description |
|-----------|------------|--------------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login` | Registration & login |
| **Users** | `GET /api/users/:id`, `PATCH /api/users/:id` | Profile and avatar updates |
| **Posts** | `GET /api/posts`, `GET /api/posts/:id`, `POST /api/posts`, `PATCH /api/posts/:id`, `DELETE /api/posts/:id` | Full post CRUD |
| **Comments** | `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments`, `PATCH /api/comments/:id`, `DELETE /api/comments/:id` | Comments management |
| **Likes** | `POST /api/likes` | Like/dislike for post or comment |

---

## Summary
- The **algorithm** describes the complete data flow: initialization → auth → content → likes → rating → rendering.
- The **CBL progress** is detailed by stage with goals, activities, artifacts, decisions, and evaluation.
- This documentation ensures both developers and reviewers fully understand how the project evolved and operates.
