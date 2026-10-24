# DevBoard

**A full-stack project management and developer collaboration platform.**

DevBoard is an ongoing project built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM. It focuses on secure authentication, user-specific project management, and maintainable full-stack engineering.

The long-term goal is to evolve it into a collaboration platform combining project and task management with features such as real-time updates and background processing.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express
- **Database:** PostgreSQL, Drizzle ORM
- **Authentication:** Argon2 password hashing, server-side sessions
- **Testing:** Vitest, Testing Library
- **Tools:** Git, GitHub, pnpm

## Features Implemented

- User registration and login
- Password hashing with Argon2
- Persistent server-side sessions and session restoration
- Authenticated project management
- Project creation, editing, and deletion
- Owner-based authorization to prevent access to other users' projects
- Request validation and origin checks
- Automated backend and frontend tests
- Frontend loading, error, and authentication states

## Architecture

DevBoard uses a React frontend that communicates with an Express REST API. The API handles authentication, authorization, request processing, and database operations through PostgreSQL and Drizzle ORM.

Authentication uses server-side sessions rather than storing user credentials in the browser. Project access is enforced by the backend, so authorization does not depend on the frontend alone.

## Getting Started

### Prerequisites

- Node.js
- pnpm
- PostgreSQL

### 1. Clone the repository

```bash
git clone https://github.com/Harshdubey5/devboard.git
cd devboard
```

### 2. Configure the backend

Create `apps/api/.env` using `apps/api/.env.example`.

Configure the PostgreSQL connection string, a strong session secret of at least 32 characters, and the required environment variables.

Run database migrations:

```bash
pnpm --dir apps/api db:migrate
```

Start the API:

```bash
pnpm --dir apps/api dev
```

The API's default local address is `http://localhost:4000`.

### 3. Configure the frontend

Create `apps/web/.env` using `apps/web/.env.example`.

Set `VITE_API_BASE_URL` to the local API URL, then start the frontend:

```bash
pnpm --dir apps/web dev
```

Vite uses port `5173` by default.

### 4. Run the tests and quality checks

Backend:

```bash
pnpm --dir apps/api test
pnpm --dir apps/api typecheck
pnpm --dir apps/api build
```

Frontend:

```bash
pnpm --dir apps/web test
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

**Testing note:** Configure `.env.test` to use the dedicated `devboard_test` database. The API test safety check prevents tests from running against an incorrectly named database.

## Project Roadmap

DevBoard is being developed incrementally, with an emphasis on understanding the engineering behind each feature.

Planned improvements include:

- Further dashboard UI and responsive design refinement
- Additional security verification and production hardening
- Deployment of the frontend, API, and PostgreSQL database
- Team collaboration, task assignments, and comments
- Real-time updates and WebSockets
- Redis caching and background jobs
- Docker, cloud infrastructure, CI/CD, and observability

These are planned improvements, not claims about functionality already implemented.

## Author

**Harsh Dubey**

- [GitHub](https://github.com/Harshdubey5)
- [LinkedIn](https://linkedin.com/in/harsh-dubey-a19165256)
- [Technical Blog](https://hashnode.com/@d-harsh)
