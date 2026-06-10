CaenCRM — Project Context (read this first)

Stack:
- React 19.2.4 + TypeScript 5.8 + Vite 6.2
- react-router-dom 7.17 (router interno)
- lucide-react for icons
- Tailwind via CDN script in index.html (NOT npm-installed)
- No backend: Chatwoot API consumed directly via Vite dev proxy (`/chatwoot-api-v1`, `/chatwoot-auth`, `/chatwoot-api-v2`, `/chatwoot-cable` with WS) configured in vite.config.ts
- Project root: C:/Users/Henrique de Souza/Desktop/Apps/Caen/CAEN/CaenCRM
- Portuguese (pt-BR) UI strings throughout

Project structure:
- App.tsx              — router + lazy-loaded page components
- components/          — page-level components (Contacts, Companies, Appointments, Prospecting, SettingsView, etc.) + ui/ helpers
- contexts/            — AuthContext, MenuContext, ThemeContext, ToastContext
- hooks/               — useAccount, useChatwootApi, useChatwootSocket, useCompanies, useContacts, useConversations, useInfiniteScroll
- api/chatwoot.ts      — Chatwoot API client (410 lines)
- api/evolution.ts     — Evolution API client (WhatsApp)
- types/chatwoot.ts    — Chatwoot type definitions
- utils/csvParser.ts   — CSV parser for bulk import
- index.html           — has importmap with esm.sh CDN mappings (TO BE REMOVED — see topic 6)
- vite.config.ts       — dev server + proxy config
- .env.local           — VITE_CHATWOOT_URL, GEMINI_API_KEY, etc. (DO NOT read or commit)

Key current state issues (baseline before your work):
- `npm run build` is BROKEN: components/Contacts.tsx:286 has a syntax error ("Expected ')' but found '{'") — the setSentinel integration from useInfiniteScroll is incomplete
- Tailwind is loaded via CDN script in index.html — works in dev/prod but is a known issue (to be addressed in topic 6)
- importmap with esm.sh mappings for react/react-dom/react-router/lucide-react exists in index.html — to be removed (topic 6) since deps are already in node_modules
- Many components are mocks: Prospecting.tsx (static UI, no real search), SettingsView.tsx (readOnly fields, no save logic), Appointments.tsx (hardcoded data list, no real calendar)
- Contacts/Companies already have useInfiniteScroll imported AND a setSentinel call, but the page-level integration is broken (build error + likely missing sentinel div in JSX)

Build / test commands:
- `npm run build`     — type-check + vite build (this is the primary smoke test)
- `npm run dev`       — dev server on :3000
- `npm test`          — does NOT exist yet; Vitest is the expected choice (topic 5)

Coding conventions:
- Portuguese UI strings
- Tailwind utility classes; dark: variants for dark mode
- `cn`-style not used; class names inline
- Icons from lucide-react
- Hooks in /hooks named `useX.ts`
- API client functions return Promises that may throw — components should catch and surface errors

Strict rules (apply to all topics):
- Do NOT touch .env.local. Do NOT print secrets.
- Do NOT add new top-level dependencies without justification in the final summary.
- Do NOT break the existing Chatwoot API client contract used by other components.
- Preserve the existing dark/light theme system.
- When done, run `npm run build` from the project root and confirm it passes. If it fails, fix it before reporting.
- Reply in Portuguese (pt-BR) in the final summary.
