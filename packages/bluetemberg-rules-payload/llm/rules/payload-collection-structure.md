---
description: Public Payload 3 collections follow a consistent shape — tracking fields, Content/SEO tabs, drafts with scheduled publish, and a slug field.
scope: "src/collections/**"
stacks:
  payload: ">=3 <4"
---

# Payload collection structure

Every public-facing collection (rendered on the front end) should share the same skeleton so editors and code see a predictable shape. Targets Payload 3 (Next-native, Lexical, Drizzle/Postgres).

## Rules

- **Tracking fields:** include `createdBy` / `updatedBy` (relationship to users, populated via hooks) and a `publishedAt` date. Don't hand-roll these per collection — share them via a field builder ([`payload-field-builder-pattern`](payload-field-builder-pattern)).
- **Tabs:** organise fields into a **Content** tab and an **SEO** tab (the latter from the SEO plugin) rather than a flat field list.
- **Versions + drafts:** enable `versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 }` for editorial collections so content can be drafted, scheduled, and rolled back without unbounded row growth.
- **Slug:** use the shared `slugField()` builder for the URL identifier — consistent validation, formatting, and `dbName`.
- **Revalidation:** any collection read on the front end needs revalidation hooks — see [`payload-revalidation-hook-required`](payload-revalidation-hook-required).

## Example

```ts
export const Pages: CollectionConfig = {
  slug: 'pages',
  access: { read: anyone, update: or(superAdminAccess, marketEditorAccess) },
  versions: { drafts: { schedulePublish: true }, maxPerDoc: 50 },
  fields: [
    ...slugField(),
    { type: 'tabs', tabs: [
      { label: 'Content', fields: [ /* ... */ ] },
      { label: 'SEO', fields: [ /* seo plugin fields */ ] },
    ] },
    ...trackingFields(), // createdBy / updatedBy / publishedAt
  ],
  hooks: { afterChange: [revalidatePage], afterDelete: [revalidatePage] },
}
```

## When NOT to apply

- Internal / admin-only collections never rendered on the front end (no SEO tab, no revalidation, drafts optional).
- Join/relationship-only collections with no editorial content.
