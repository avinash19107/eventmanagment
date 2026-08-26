# 🎟️ ApexEvents - Event Management & QR Attendance System

A high-performance, modern Web Application for managing events, generating 3D holographic digital ticket passes, conducting real-time QR attendance verification, and visualizing live venue heatmaps. Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Three.js.

---

## 🌟 Key Features

### 1. 🔐 Purple Split-Screen Universal Login Portal
- **Identity-Based Multi-Role Sign In**: Unified login portal supporting Admin, Student (Attendee), and Teacher (Staff) authentication without role dropdown clutter.
- **Custom Background Video Banner**: High-definition video player strictly bounded within the left card panel (`rounded-l-[32px] overflow-hidden`) directly behind the *"Welcome back!"* title.
- **Interactive Sound Controls**: Glassmorphic Mute/Unmute audio button (`<Volume2 />` / `<VolumeX />`) allows toggling video sound on/off.
- **Clean Unobstructed View**: Free of overlay obstructions, featuring high-contrast crisp text formatting.

### 2. 🎨 Design & Aesthetic Principles
- **Light Theme Design System**: Powered by crisp slate-50 backgrounds, vibrant indigo & purple gradients, and glassmorphic translucent panels.
- **Multi-Page View Routing**: Dedicated page flows for Sign In, Register, and Account Password Reset with prominent **"← Back to Sign In"** navigation.

## 🔑 Default Roles & Access Control

| Role | Default Login Identifier | Access Capabilities |
| :--- | :--- | :--- |
| **🛡️ Admin** | `admin@apexevents.in` | Master control, user management, audit logs, event controls |
| **🎪 Organizer** | `organizer@apexevents.in` | Host events, mobile QR gate scanner, check-in rosters |
| **🎓 Teacher** | `teacher@apexevents.in` | View student attendance records, events participation analytics |

> 🔒 **Security Notice**: Credentials are cryptographically salted and hashed using Web Crypto SHA-256 in production. Change passwords immediately via the Admin Center.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 2. Installation
```bash
# Clone or navigate to directory
cd C:\Users\kasuk\.gemini\antigravity-ide\scratch\event-qr-attendance

# Install dependencies
npm install
```

### 3. Running Locally
```bash
# Start Vite development server
npm run dev
```
Open `http://localhost:5180/` (or the active Vite port shown in your terminal).

### 4. Customizing Your Login Background Video
Place your custom `.mp4` video file in the `public/` directory:
- Path: `public/login-bg.mp4`
- The application will automatically detect and play your custom video in high-definition inside the login left banner!

---

## 📁 Project Structure

```
event-qr-attendance/
├── public/
│   ├── login-bg.mp4          # Custom background video for Login Portal
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   └── auth/
│   │       ├── LoginPage.tsx              # Purple Split-Screen Login Card
│   │       └── LoginVideoBackground.tsx   # Video Player & Sound Controls
│   ├── services/
│   │   ├── auth.ts                        # Auth Service Logic
│   │   ├── email.ts                       # Transactional Email Service
│   │   └── storage.ts                     # Local Storage Repository & Audit Logging
│   ├── types/
│   │   └── index.ts                       # PRD TypeScript Interfaces & Schemas
│   ├── App.tsx                            # Main App Container & Header
│   ├── index.css                          # Tailwind CSS v4 Design Tokens
│   └── main.tsx                           # App Entry Point
├── package.json
├── tsconfig.json
├── tsconfig.app.json
└── vite.config.ts
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
