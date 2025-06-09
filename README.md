---
📝 ToDo App
---

This is a full-stack ToDo List App built entirely on the Cloudflare Developer Platform, featuring persistent user authentication, real-time stateful interactions, and a React-based UI. The entire app can be deployed globally using Cloudflare Workers.

---
**Tech Stack**
---

Frontend: React with Tailwind CSS and Shadcn UI
Backend: Cloudflare Workers using the Hono framework
Authentication: JWT-based with secure cookies and KV for session management
Database: Cloudflare D1 (SQLite-compatible SQL)
Session Store: Cloudflare KV

---
**Features**
---

User Sign Up / Sign In with email and password
JWT-authenticated sessions stored in KV
Create, list, and delete ToDo items linked to each user
Checkbox-based UI for completing (and deleting) ToDos
Responsive UI with persistent Navbar and Footer
Google Fonts integration
Deployable via a single button to any Cloudflare account

**One-Click Deploy**

You can deploy this app to your own Cloudflare account using the button below:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vnikhilbuddhavarapu/workers-todo-app)

# Install deps

npm install

# Dev mode

npm run dev

# Build

npm run build

# Deploy to Cloudflare

npm run deploy

---
**Environment Requirements**
---

Node.js (for local development)
Wrangler CLI
Public GitHub account (for Deploy to Cloudflare button)

Feedback / Contributions

PRs welcome! File issues or improvements via GitHub.

---
**Resources**
---

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [React](https://react.dev/)
- [Hono](https://hono.dev/)
- [KV](https://developers.cloudflare.com/kv/)
- [D1](https://developers.cloudflare.com/d1/)

---
**License**
---

MIT
