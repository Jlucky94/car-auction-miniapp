# Project AI Master Instructions

## 1) Project Overview
Telegram Mini App incremental game.

## 2) Architecture
- `apps/web` → UI layer.
- `apps/api` → authoritative backend.
- `packages/shared` → pure domain logic only.

## 3) Core Principles
- Backend is authoritative.
- Shared contains only pure functions.
- No business logic duplication.
- Frontend never writes directly to database.
- No cookie sessions (Bearer token only).
- Small iterative changes only.

## 4) Development Philosophy
- Write types first.
- Avoid hidden side effects.
- Clear error logging.
- Minimal complexity.

## 5) Telegram Constraints
- HTTPS required in production.
- Avoid cookies.
- Use `Authorization` header.
- Keep bundle small.
