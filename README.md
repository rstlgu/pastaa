# 🔐 Pasta - Secure Text Sharing

Web platform to securely share text with **end-to-end encryption** and **zero registration**.

## ✨ Features

- 🔒 **End-to-End Encryption**: AES-GCM 256-bit
- 🚫 **Zero Registration**: No user data saved
- ⚡ **Fast**: Client-side encryption with Web Crypto API
- 🔥 **Burn After Reading**: Automatic deletion after first read
- ⏰ **Customizable Expiry**: 1h, 4h, 1d, 7d
- 🔑 **Optional Password**: Second level of protection
- 🎨 **Modern UI**: Dark/light theme, animations with Framer Motion
- 📱 **Responsive**: Mobile-first design with native share

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React, Tailwind CSS, Shadcn UI
- **Animations**: Framer Motion
- **Encryption**: Web Crypto API
- **Database**: PostgreSQL + Prisma (SQLite for local dev)
- **TypeScript**: Type-safe
- **Deploy**: Vercel-ready

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## 🌐 Deploy to Vercel

### Prerequisites
- [Vercel](https://vercel.com) account
- PostgreSQL database (recommended: Vercel Postgres)

### Quick Setup

1. **Create PostgreSQL Database**
   - Vercel Dashboard → Storage → Create Database → Postgres
   - Copy the `DATABASE_URL`

2. **Deploy**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

3. **Configure Environment Variables**
   - Settings → Environment Variables
   - Add: `DATABASE_URL=postgres://...`

4. **Initialize Database**
   ```bash
   # From your machine
   vercel env pull .env.local
   npx prisma db push
   ```

📖 **Complete Guide**: See [DEPLOY.md](./DEPLOY.md)

## 🔐 Security Architecture

### Encryption Flow

1. **Creation**: 
   - User writes text
   - AES-256 key generation in browser
   - Encryption with AES-GCM
   - Send only encrypted content to server

2. **Sharing**:
   - URL: `https://site.com/view/{id}#base64_key`
   - The fragment `#key` is NEVER sent to the server
   - Stays only in the browser

3. **Reading**:
   - Download encrypted content
   - Extract key from fragment
   - Decrypt locally in browser

### Security

- ✅ Key never transmitted to server
- ✅ Server only sees encrypted data
- ✅ Encryption: AES-GCM 256-bit
- ✅ Random IVs for each paste
- ✅ No tracking, no cookies
- ✅ Automatic expiry deletion

## 📁 Project Structure

```
pasta/
├── app/
│   ├── api/paste/          # API Routes
│   ├── view/[id]/          # View page
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage
│   └── globals.css         # Global styles
├── components/ui/          # UI Components
├── lib/
│   ├── crypto.ts           # Cryptography library
│   ├── db.ts               # Prisma client
│   └── utils.ts            # Utilities
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
```

## 🎯 API Endpoints

### POST `/api/paste`

Create new encrypted paste.

**Body**:
```json
{
  "encryptedContent": "string",
  "iv": "string",
  "hasPassword": boolean,
  "burnAfterReading": boolean,
  "expiresIn": "1h" | "24h" | "7d" | "never"
}
```

**Response**:
```json
{
  "id": "uuid"
}
```

### GET `/api/paste/{id}`

Retrieve encrypted paste.

**Response**:
```json
{
  "encryptedContent": "string",
  "iv": "string",
  "hasPassword": boolean,
  "burnAfterReading": boolean
}
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
DATABASE_URL="file:./dev.db"
```

### Database

The project uses SQLite for simplicity. For production, consider PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 📦 Deploy

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm run db:push
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Best Practices

1. **URL Fragment**: The key in URL fragment (#) is NEVER sent to the server
2. **HTTPS Required**: Always use HTTPS in production
3. **Limits**: Max 100KB of text per paste
4. **Cleanup**: Automatic job to delete expired pastes

## 📄 License

MIT License - Use freely!

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

## 🙏 Credits

Created with ❤️ using:
- [Next.js](https://nextjs.org/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Prisma](https://www.prisma.io/)

---

**⚠️ Disclaimer**: This is an educational project. For production use, consider professional security audits.
