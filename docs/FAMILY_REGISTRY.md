# Family Registry

Which families exist, their URLs, and which adventures they can access.

The source of truth for adventure visibility is `familyExclusiveAdventures` in `src/lib/adventures.ts`. This doc is the human-readable reference.

---

## Active Families

| Family | Slug | URL | Adventures |
|--------|------|-----|------------|
| Jenny (dev/internal) | `jd` | `/dm/jd` | All 11 main adventures |
| Kang (Ruogu + Miles) | `rkang-family` | `/dm/rkang-family` | Ring Riders of Saturn |

## Adding a New Family

1. Pick a slug (not easily guessable)
2. Add their adventures to `familyExclusiveAdventures` in `src/lib/adventures.ts`
3. If they need custom images, generate and place in `public/images/*/adventure-name/`
4. Send them their URL: `https://adventures-blush.vercel.app/dm/{slug}`
5. Add them to the table above

---

*Last updated: February 7, 2026*
