---
description: Bind ValidationPipe globally with whitelist on, so NestJS DTOs strip or reject request fields they don't declare.
scope: "**/*.ts"
stacks:
  nestjs: ">=8 <13"
---

# NestJS ValidationPipe whitelist

A DTO only protects a route if a pipe runs it. Without a bound `ValidationPipe`, decorators like `@IsString()` do nothing and the raw body reaches the handler. Without `whitelist`, extra properties pass straight through, so a client can send `{ "name": "x", "role": "admin" }` to an endpoint that spreads the body into a database write (mass assignment).

## Rules

- Bind `ValidationPipe` once at application level, in `main.ts` with `app.useGlobalPipes(...)`, so every endpoint is validated. Don't rely on remembering `@UsePipes()` per route.
- Set `whitelist: true`. Properties without any validation decorator are stripped from the validated object.
- Set `forbidNonWhitelisted: true` on APIs where an unexpected field means a client bug. The request then fails with 400 instead of being silently trimmed.
- Give every DTO property at least one class-validator decorator. Under `whitelist`, an undecorated property is stripped, even when it's declared in the class. Use `@IsOptional()` for optional fields.
- Type a whole-object `@Body()`, `@Query()` or `@Param()` with a DTO class, not an interface, a type alias or `any`. Those compile to `Object`, which `ValidationPipe` skips, so nothing is validated or stripped. For a single route parameter, use a built-in parse pipe such as `@Param('id', ParseIntPipe)` or `ParseUUIDPipe`.
- Write to the database from the validated DTO's fields. Never spread `req.body` into an insert or update.

## Examples

```ts
// BAD — no pipe bound; decorators never run, and `role` reaches the insert
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}

@Post()
create(@Body() body: CreateUserDto) {
  return this.users.insert({ ...body })
}

// GOOD — global pipe strips undeclared fields and rejects unknown ones
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  )
  await app.listen(3000)
}

export class CreateUserDto {
  @IsString()
  @Length(1, 100)
  name: string

  @IsOptional()
  @IsEmail()
  email?: string
}

@Post()
create(@Body() dto: CreateUserDto) {
  return this.users.insert({ name: dto.name, email: dto.email })
}
```

## Gotchas

- `whitelist` and `forbidNonWhitelisted` are class-validator options passed through `ValidationPipe`. They apply to class-based DTOs only. `StandardSchemaValidationPipe` (NestJS 12+, for Zod, Valibot or ArkType schemas) ignores them, and the schema itself decides what happens to unknown keys.
- In a hybrid application, `useGlobalPipes()` doesn't set up pipes for connected microservices by default. To register the pipe globally from inside a module instead, provide it as `{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }) }`.
- A nested object is validated only with `@ValidateNested()`, and only if it's an instance of a class. Add `@Type(() => ChildDto)` from `class-transformer` so the plain JSON is turned into that class.

## Source

- NestJS — Validation: <https://docs.nestjs.com/techniques/validation> (global binding, `whitelist`, `forbidNonWhitelisted`, stripping properties, `StandardSchemaValidationPipe`).
- `ValidationPipeOptions` and `toValidate()` (skips `Object` and primitive metatypes) in [nestjs/nest `packages/common/pipes/validation.pipe.ts`](https://github.com/nestjs/nest/blob/master/packages/common/pipes/validation.pipe.ts) — checked at v8.0.0, v9.0.0 and v12.3.3. `standard-schema-validation.pipe.ts` first appears in v12.0.0.
- NestJS — Pipes, global scoped pipes and `APP_PIPE`: <https://docs.nestjs.com/pipes>; value providers (`useValue`): <https://docs.nestjs.com/fundamentals/custom-providers>.
- class-validator — Whitelisting and nested validation: <https://github.com/typestack/class-validator#whitelisting>.
- class-transformer — Working with nested objects (`@Type`): <https://github.com/typestack/class-transformer#working-with-nested-objects>.
