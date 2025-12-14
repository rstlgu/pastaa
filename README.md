<div align="center">
  <br />
  <img src="public/logo.svg" alt="Pastaa Logo" width="80" height="80" />
  <h1>Pastaa</h1>
  <p><strong>Secure Text Sharing & Encrypted Chat</strong></p>
  <br />
  <p>
    <a href="#features">Features</a> •
    <a href="#chat">Chat</a> •
    <a href="#technology-stack">Tech Stack</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#docker">Docker</a> •
    <a href="#security">Security</a>
  </p>
  <br />
</div>

---

## Features

### Send (Encrypted Paste)
- **End-to-End Encryption** — AES-GCM 256-bit, keys never leave your browser
- **Zero Registration** — No accounts, no tracking, no cookies
- **Burn After Reading** — Automatic deletion after first view
- **Password Protection** — Optional second layer of security

### Share (Real-time Collaboration)
- **Live Collaboration** — Multiple users editing simultaneously
- **Presence Indicators** — See who's viewing in real-time
- **Custom Expiry** — Set content lifetime: 1 hour to 30 days, or never
- **Code Editor** — Syntax highlighting for 12+ languages

### Chat (Encrypted Group Chat)
- **Triple Encryption** — TLS + AES-256-GCM + ChaCha20-Poly1305
- **No Storage** — Messages are never stored on the server
- **Channel Password** — Encryption key derived from password you choose
- **Real-time** — Instant message delivery via WebSockets
- **Zero Knowledge** — Server cannot read your messages

---

## Chat

Pastaa Chat is inspired by [ChatCrypt](https://www.chatcrypt.com) and provides secure group messaging with end-to-end encryption.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      LAYER 1: TLS                               │
│  Browser ←──────────── HTTPS ──────────────→ Server             │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 2: Transport                           │
│  WebSocket connection via Pusher (encrypted channel)            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                LAYER 3: End-to-End (E2E)                        │
│  ChaCha20-Poly1305 encryption                                   │
│  Key = derive(channel_password)                                 │
│  Only users with the same password can decrypt                  │
└─────────────────────────────────────────────────────────────────┘
```

### Chat Features

| Feature | Description |
|---------|-------------|
| Channel-based | Create or join channels by name |
| Password encryption | Messages encrypted with channel password |
| No persistence | Messages exist only during session |
| Telegram-style avatars | Colored initials for each user |
| Real-time presence | See who's in the channel |

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | React, Tailwind CSS, Shadcn UI |
| Animations | Framer Motion |
| Encryption | Web Crypto API, @noble/ciphers |
| Database | PostgreSQL + Prisma |
| Editor | CodeMirror, TipTap |
| Real-time | Pusher (WebSockets) |
| Deployment | Vercel, Docker |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Pusher account (for Chat feature)

### Installation

```bash
# Clone the repository
git clone https://github.com/rstlgu/pastaa.git
cd pastaa

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your settings

# Setup database
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# Database (required)
DATABASE_URL="postgresql://user:password@host:5432/database"

# Pusher (required for Chat)
PUSHER_APP_ID="your_app_id"
PUSHER_SECRET="your_secret"
NEXT_PUBLIC_PUSHER_KEY="your_key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"
```

---

## Docker

### Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/rstlgu/pastaa.git
cd pastaa

# Create .env file with Pusher credentials (for Chat)
cat > .env << EOF
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=eu
EOF

# Start the stack
docker-compose up -d

# Run migrations
docker-compose run --rm migrate
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Docker Compose Services

| Service | Description | Port |
|---------|-------------|------|
| `app` | Next.js application | 3000 |
| `db` | PostgreSQL database | 5432 (internal) |
| `migrate` | One-time migration job | - |

### Build Docker Image Manually

```bash
# Build the image
docker build -t pastaa .

# Run with external database
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e PUSHER_APP_ID="your_app_id" \
  -e PUSHER_SECRET="your_secret" \
  -e NEXT_PUBLIC_PUSHER_KEY="your_key" \
  -e NEXT_PUBLIC_PUSHER_CLUSTER="eu" \
  pastaa
```

### Self-Hosting Requirements

| Component | Required | Notes |
|-----------|----------|-------|
| PostgreSQL | Yes | For storing encrypted pastes and share pages |
| Pusher | Only for Chat | Free tier available at pusher.com |
| Redis | No | Not required |
| Object Storage | No | All data stored in database |

### What Works Without Pusher

| Feature | Without Pusher |
|---------|----------------|
| Send (Encrypted Paste) | ✅ Works |
| View Paste | ✅ Works |
| Share (Collaboration) | ✅ Works (presence disabled) |
| Chat | ❌ Requires Pusher |

---

## Security

### Encryption Details

| Feature | Algorithm | Key Size |
|---------|-----------|----------|
| Send (Paste) | AES-GCM | 256-bit |
| Chat Messages | ChaCha20-Poly1305 | 256-bit |
| Key Derivation | Custom hash function | - |

### Security Guarantees

| Feature | Status |
|---------|--------|
| Keys transmitted to server | Never |
| Server can read your content | No |
| Chat messages stored | Never |
| User tracking | None |
| Cookies | None |
| Automatic expiry deletion | Yes |

### Zero Knowledge Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR BROWSER                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Generate encryption key                                      │
│  2. Encrypt content with key                                     │
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
│  • Chat: only relays encrypted messages                         │
└─────────────────────────────────────────────────────────────────┘
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
