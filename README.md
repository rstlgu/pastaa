<div align="center">
  <br />
  <img src="public/logo.svg" alt="Pastaa Logo" width="80" height="80" />
  <h1>Pastaa</h1>
  <p><strong>Secure Text Sharing with End-to-End Encryption</strong></p>
  <br />
  <p>
    <a href="#features">Features</a> •
    <a href="#technology-stack">Tech Stack</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#security">Security</a> •
    <a href="#contributing">Contributing</a>
  </p>
  <br />
</div>

---

## Features

- **End-to-End Encryption** — AES-GCM 256-bit encryption, keys never leave your browser
- **Zero Registration** — No accounts, no tracking, no cookies
- **Burn After Reading** — Automatic deletion after first view
- **Custom Expiry** — Set content lifetime: 1 hour to 30 days, or never
- **Password Protection** — Optional second layer of security
- **Real-time Collaboration** — Share pages with live presence indicators
- **Code Editor** — Syntax highlighting for 12+ languages
- **Modern UI** — Dark/light themes, smooth animations, mobile-first design

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | React, Tailwind CSS, Shadcn UI |
| Animations | Framer Motion |
| Encryption | Web Crypto API |
| Database | PostgreSQL + Prisma |
| Editor | CodeMirror, TipTap |
| Deployment | Vercel |

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use Supabase/Vercel Postgres)

### Installation

```bash
# Clone the repository
git clone https://github.com/rstlgu/pastaa.git
cd pastaa

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your database URL

# Setup database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Security

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR BROWSER                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Generate AES-256 key                                        │
│  2. Encrypt text with key                                       │
│  3. Send encrypted data to server                               │
│  4. Key stays in URL fragment (#) — never sent to server        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           SERVER                                 │
├─────────────────────────────────────────────────────────────────┤
│  • Receives only encrypted content                              │
│  • Cannot decrypt without the key                               │
│  • Zero knowledge architecture                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Guarantees

| Feature | Status |
|---------|--------|
| Key transmitted to server | Never |
| Server can read your content | No |
| Encryption standard | AES-GCM 256-bit |
| IV (Initialization Vector) | Random per paste |
| User tracking | None |
| Cookies | None |
| Automatic expiry deletion | Yes |

---

## Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

For local development with SQLite:

```env
DATABASE_URL="file:./dev.db"
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — Use freely!

---

<div align="center">
  <sub>Built with care by <a href="https://github.com/rstlgu">rstlgu</a></sub>
</div>
