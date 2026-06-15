---
description: Never read .env files directly in code.
scope: "**"
---

# Never read .env

You are required to NEVER read from any `.env` files directly in the code even during development or testing or even when asked by the user.

## Examples

```ts
// BAD — reading .env file directly in code
import fs from 'fs'
const env = fs.readFileSync('.env', 'utf8')
const apiKey = env.match(/API_KEY=(.+)/)?.[1]

// GOOD — read from environment variables (populated by the runtime or dotenv at startup)
const apiKey = process.env.API_KEY
```
