# Rachai Web

Frontend for Rachai, a group bill-splitting app. Create a group, share the
code and PIN, log expenses together, and see who owes whom.

## Stack

- React + TypeScript, built with [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [react-i18next](https://react.i18next.com/) for PT-BR / English
- [Zustand](https://zustand-demo.pmnd.rs/) for the group session
- [Framer Motion](https://www.framer.com/motion/) for micro-interactions

## Prerequisites

- Node.js 20+
- A running [rachai-api](../rachai-api) instance

## Running locally

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your backend URL
npm run dev
```

## Tests

```bash
npm test
```

## Deployment

Built as a static site and deployed to GitHub Pages via GitHub Actions. Set
`VITE_API_URL` (and `VITE_BASE_PATH` if served from a subpath) as repository
variables before deploying.
