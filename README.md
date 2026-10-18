# Rachai Web

Interactive GitHub Pages demo for Rachai, a group bill-splitting app. Create a
group, log expenses and settle balances in your browser. Demo data stays in
localStorage; invite links work only in the browser where the group was created.

## Stack

- React + TypeScript, built with [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [react-i18next](https://react.i18next.com/) for PT-BR / English
- [Zustand](https://zustand-demo.pmnd.rs/) for the group session
- [Framer Motion](https://www.framer.com/motion/) for micro-interactions

## Prerequisites

- Node.js 20+

## Running locally

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Deployment

Built as a static site and deployed to GitHub Pages via GitHub Actions:
**https://lucianookdp.github.io/rachai-web/**

`VITE_BASE_PATH` is read by the deploy workflow at build time. No API or
Railway service is used by the Pages demo.
