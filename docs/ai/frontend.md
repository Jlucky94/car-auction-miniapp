# Frontend Rules

- Stack is **Vite + React + TypeScript** only.
- Use **functional components only**.
- **Class components are forbidden**.
- Keep components presentational; **no business logic inside components**.
- Put all API calls in a dedicated `api` module.
- All HTTP requests must use paths under **`/api`**; never hardcode hosts.

## State Management

- Use **minimal local state** initially.
- **Zustand** is the planned global state solution (to be added later).

## Design

- Keep UI **minimal**.
- Use **no heavy UI libraries**.
- Build **mobile-first**.
