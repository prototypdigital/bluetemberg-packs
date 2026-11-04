---
description: Keep user input in Drizzle's sql template parameters; never pass it to sql.raw() or build SQL with string concatenation.
scope: "**/*.ts"
stacks:
  drizzle: ">=0.30 <0.46 || >=1.0.0-rc.1 <1.0.0"
---

# Drizzle parameterized SQL

Drizzle's `sql` template sends each interpolated plain value (string, number, …) as a bound parameter (`$1`, `$2`, …), separately from the query text, which is what prevents SQL injection. Tables, columns and nested `sql` chunks are inlined as SQL instead. `sql.raw()` and string building opt out of that. Input that reaches them becomes executable SQL.

## Rules

- Interpolate values only inside the `sql` tagged template, `` sql`... ${value}` ``. Never build the query as a string and pass it to `sql.raw()` or `db.execute()`.
- Use `sql.raw()` only for constant SQL fragments written in the code, such as a keyword or a separator. Never pass request data, environment input or database content to it.
- For a dynamic table or column name, map the input to a schema object from an allowlist (`{ name: users.name, createdAt: users.createdAt }`). If the name must be a string, `sql.identifier()` quotes it, but its own docs warn it gives no protection against SQL injection. Check the value against an allowlist before passing it.
- For `IN` lists, use the query builder's `inArray(column, values)`. Inside a raw `sql` query, build lists from `sql` chunks joined with `sql.join()`, never from `.join(',')` on a string array.

## Examples

```ts
// BAD — user input becomes SQL text
const rows = await db.execute(
  sql.raw(`select * from users where email = '${req.query.email}'`),
);
const sorted = await db.execute(
  sql`select * from ${users} order by ${sql.raw(req.query.sort)}`,
);

// GOOD — value bound as $1; sort column chosen from an allowlist
const rows = await db.execute(
  sql`select * from ${users} where ${users.email} = ${req.query.email}`,
);
// select * from "users" where "users"."email" = $1 --> [email]

const sortable = { name: users.name, createdAt: users.createdAt } as const;
const column = Object.hasOwn(sortable, req.query.sort)
  ? sortable[req.query.sort as keyof typeof sortable]
  : users.createdAt;
const sorted = await db.select().from(users).orderBy(column);
```

```ts
// BAD — ids joined into the query text
sql.raw(`select * from users where id in (${ids.join(",")})`);

// GOOD — each id is its own parameter
await db.select().from(users).where(inArray(users.id, ids));

// GOOD — same, inside a raw sql query
sql`select * from ${users} where ${users.id} in (${sql.join(
  ids.map((id) => sql`${id}`),
  sql`, `,
)})`;
```

## Gotchas

- `sql.raw()` inside a `sql` template is still raw: `` sql`... ${sql.raw(x)}` `` inlines `x` unescaped.
- Check allowlist membership with `Object.hasOwn()` (or use a `Map`), not `sortable[key] ?? fallback`. Inherited keys such as `toString` or `constructor` return a function, not `undefined`, so they get past a plain lookup.

## Source

- Drizzle ORM — Magic `sql` operator: <https://orm.drizzle.team/docs/sql> (parameter binding, "prevents any potential SQL Injection vulnerabilities", `sql.raw()` with no escaping, `sql.join()`).
- `sql.identifier()` (including its "does not offer any protection against SQL injections" warning), `sql.join()` and `inArray()` — drizzle-orm's published typings (`sql/sql.d.ts`, `sql/expressions/conditions.d.ts`), checked in 0.30.0, 0.45.4 and 1.0.0-rc.5. The stack range covers exactly those lines: stable 0.30–0.45 and the 1.0 release candidates.
- OWASP — SQL Injection Prevention Cheat Sheet (parameterized queries, allowlisting identifiers): <https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html>.
