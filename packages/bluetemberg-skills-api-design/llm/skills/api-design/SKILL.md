---
name: api-design
description: Design RESTful HTTP API endpoints with a step-by-step naming, pagination, versioning, and error-contract protocol.
---

# api-design

Use this skill when designing new HTTP API endpoints or reviewing existing API contracts.

## Triggers

- New endpoint or route creation
- API contract review or documentation
- Pagination, filtering, or sorting implementation
- Breaking change review before a version bump

## Protocol

### Step 1 — Name the resource correctly

- Use plural nouns: `/users`, `/orders`, `/invoices/{id}/line-items`
- No verbs in the path: actions are expressed by the HTTP method
- Nest at most one level deep; deeper nesting → promote to a top-level resource

```text
BAD:  POST /createUser
      GET  /user/getAll
      GET  /orders/{id}/items/{itemId}/variants/{variantId}/prices

GOOD: POST /users
      GET  /users
      GET  /orders/{id}/line-items
```

### Step 2 — Choose pagination strategy

```text
Is the dataset append-only or sorted by a monotonic key (e.g., created_at)?
  YES → cursor-based pagination
        Request:  ?after=<opaque_cursor>&limit=N
        Response: { data: [...], next_cursor: "...", has_more: bool }

  NO  → Is random-page access required (UI shows page numbers)?
          YES → offset pagination
                Request:  ?page=N&per_page=N
                Response: { data: [...], total: N, page: N, per_page: N }
          NO  → cursor-based (default)
```

Never mix strategies on the same collection endpoint. Never expose raw SQL `OFFSET` as a public `skip` parameter — it degrades as the table grows.

### Step 3 — Define the error contract

Every error response MUST include a machine-readable `type`, a human-readable `message`, and an optional `detail` array for field-level breakdowns.

```text
BAD:  { "error": "Invalid input" }
      HTTP 500 { "message": "Something went wrong", "code": 500 }

GOOD: HTTP 422 {
        "type": "validation_error",
        "message": "Request body is invalid.",
        "detail": [
          { "field": "email", "issue": "must be a valid email address" },
          { "field": "age",   "issue": "must be an integer ≥ 0" }
        ]
      }
```

Standard `type` slugs: `not_found`, `unauthorized`, `forbidden`, `validation_error`, `conflict`, `rate_limited`, `internal_error`. Use these consistently — clients pattern-match on them.

### Step 4 — Decide on versioning

```text
Does the change rename a field, remove an endpoint, or change a field's type?
  YES → Add /v2/ prefix. Maintain /v1/ until deprecation window closes.
  NO  → No version bump needed. Adding new optional response fields is non-breaking.
```

Version in the URL path (`/v1/`), not in headers — headers are invisible to anyone browsing the API.

### Step 5 — Document shapes in the same PR

For every new or changed endpoint, include:

- Request body schema (TypeScript interface or JSON Schema)
- Response shape for 2xx and every expected error code
- One `curl` example showing a realistic call

## Completion checklist

- [ ] Path uses plural nouns, no verbs
- [ ] Pagination strategy chosen and matches the decision tree
- [ ] Error responses follow the standard `type`/`message`/`detail` contract
- [ ] Breaking changes bump the version prefix; additive changes do not
- [ ] Request/response shapes are documented in the same PR with a `curl` example

## When NOT to use

- Internal function-to-function calls (not an HTTP boundary)
- WebSocket or server-sent event streams (different conventions)
- gRPC or GraphQL endpoints (separate conventions apply)
