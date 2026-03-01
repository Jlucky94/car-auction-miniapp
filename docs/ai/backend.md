# Backend Agent Rules

## Stack and Runtime
- Use **Fastify** for the backend server.
- Do **not** introduce a database initially.
- Use an in-memory `Map` for temporary state.
- Server must be stateless except for the in-memory state map.

## API Contracts
- Required endpoint: `GET /api/v1/health`.
- All `POST` endpoints must validate input.
- JSON errors must always use this shape:

```json
{ "code": "string", "message": "string" }
```

## Server Configuration
- Logger must be enabled.
- Port must be `process.env.PORT ?? 3001`.
- Host must be `0.0.0.0`.
- Log clearly when the server starts listening.

## Architecture Rules
- No business logic in the backend app layer.
- All domain/business logic must be imported from `packages/shared`.
