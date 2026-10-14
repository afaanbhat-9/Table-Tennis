# 3D Online Table Tennis Game

A real-time, browser-based 3D Table Tennis game featuring single-player gameplay against an intelligent computer AI and private online multiplayer against a friend using party codes.

Visually designed to faithfully match the provided gymnasium reference image:
- **3D Table**: ITTF dimensions ($2.74\text{m} \times 1.525\text{m} \times 0.76\text{m}$) with a royal purple playing surface, white border lines (2cm), white center line (3mm), steel under-apron, sturdy black legs, net mesh with white top tape, and soft contact shadows.
- **Gymnasium Environment**: Warm polished hardwood parquet floor with glossy reflections, sports hall back wall with lower wood wainscoting paneling, Swedish wall bars (ladder racks), hallway doorway, and warm stadium lighting.
- **Paddles & Ball**: Red rubber paddle for Player 1, Green rubber paddle for Player 2 / AI, wooden handles, and a high-visibility yellow 40mm celluloid ball casting a real-time shadow.
- **Top Flip Scoreboard**: Scoreboard displaying player flags, names, active server indicators, flip-card numbers, pause button, and sound toggle button.

---

## Features

### 1. Play vs Computer (Single-Player)
- Fully playable offline without requiring a network connection.
- 3 distinct AI difficulty levels:
  - **Easy**: Relaxed reaction time (~250ms), wider prediction errors, gentle center returns.
  - **Medium**: Balanced human reaction (~130ms), corner placement, consistent rallies.
  - **Hard**: Rapid reaction (~50ms), minimal prediction error, aggressive spin and corner placement.
- Anatomical reach constraints: The AI cannot teleport or make impossible saves outside its legal physical reach.

### 2. Play with Friends (Private Online Multiplayer)
- **Strict Party Code Requirement**: Matches can **only** be created and joined using unpredictable 6-character party codes (e.g., `45FNYN`).
- **No Public Matchmaking**: No random match searches, public room browsers, or public lobbies.
- **Strict 2-Player Maximum**: Enforced strictly on the server; third players attempting to join are rejected.
- **Authoritative Simulation**:
  - The server runs a deterministic 60Hz physics simulation.
  - Controls ball trajectory, table/net collisions, scoring, deuce rules, and match state.
  - Validates client paddle inputs and rejects speed spoofing or out-of-bounds positions.
  - Broadcasts snapshots at 30Hz; clients use an interpolation buffer for smooth 60+ FPS visuals.
- **Party Lifecycle**: Host/Guest lobby, ready check, countdown synchronization, rematch support, and graceful disconnect handling.

### 3. Physics & Rules
- Substepped numerical integration (effective 240Hz) with swept collision tests to eliminate high-speed tunneling.
- ITTF scoring rules: Games to 11 points (must win by 2).
- Service rotation: Service alternates every 2 points, or every 1 point during deuce ($\ge 10\text{--}10$).
- Table bounce restitution ($e \approx 0.89$), paddle impulse deflection based on strike velocity and contact position, and net collision with tape graze detection.

### 4. Audio Engine
- Built with the procedural Web Audio API (no external sound asset loading failures):
  - Rubber paddle impact ("pock")
  - Crisp table surface bounce ("ping / tok")
  - Net graze/brush
  - Point scored chime & victory fanfare
  - Volume slider and mute toggle

---

## Project Structure

```
Table Tennis/
├── shared/                   # Common code shared by Client & Server
│   ├── constants.ts          # ITTF dimensions, physics constants, speed limits
│   ├── types.ts              # GameState, BallState, RoomState, Socket events
│   ├── physics.ts            # Deterministic 3D physics & collision engine
│   ├── rules.ts              # Table tennis scoring & service rotation rules
│   └── ai.ts                 # AI opponent with human reaction latency & prediction
├── server/                   # Authoritative Multiplayer Backend
│   ├── src/
│   │   ├── index.ts          # Express + Socket.IO server setup & static serving
│   │   ├── roomManager.ts    # 6-char party code management & 2-player enforcement
│   │   └── gameRoom.ts       # 60Hz authoritative loop & snapshot broadcaster
│   └── tsconfig.json
├── client/                   # Three.js 3D Frontend & UI
│   ├── index.html            # HUD overlay, scoreboard, and modal menus
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts           # Game state orchestrator
│       ├── renderer/         # Three.js scene, gym environment, table, paddles, ball
│       ├── audio/            # Web Audio API procedural sound synthesizer
│       ├── input/            # Mouse and touch controls with boundary clamping
│       ├── net/              # Socket.IO client with interpolation buffer
│       └── ui/               # UI manager for HUD, modals, and scoreboard
├── tests/
│   ├── game.test.ts          # Unit tests for physics, rules, and AI difficulty
│   └── multiplayer.test.ts   # Integration tests for party codes and 2-player limits
├── package.json
└── tsconfig.json
```

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended, verified on v24)
- npm (v9 or higher)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
You can run both client and server concurrently:
```bash
npm run dev
```
Or run them in separate terminals:
- **Server**: `npm run dev:server` (runs on `http://localhost:3001`)
- **Client**: `npm run dev:client` (runs on `http://localhost:3000`)

Open your browser to `http://localhost:3000`.

---

## Production Build & Execution

To build the client and compile the server:
```bash
npm run build
```

To run the unified production server (serves the frontend and handles WebSockets):
```bash
npm start
```
Open `http://localhost:3001` in your browser.

---

## Running the Automated Tests

Run the complete test suite:
```bash
npm test
```
Or run individual test suites:
- **Physics, Rules, & AI**: `npm run test:game`
- **Multiplayer Networking & Party System**: `npm run test:multiplayer`

---

## How to Test Multiplayer Locally with Two Browser Sessions

1. Start the server (`npm start` or `npm run dev`).
2. Open **Browser Window 1** (e.g. Chrome) and navigate to `http://localhost:3000` (or `http://localhost:3001` in production).
3. Open **Browser Window 2** (e.g. Chrome Incognito or Firefox) and navigate to the same URL.
4. In **Window 1 (Host)**:
   - Click **Play with Friends (Party Code)**.
   - Enter your nickname (e.g. `Host`).
   - Click **Generate Party Code**.
   - Note the 6-character code (e.g., `45FNYN`) or click it to copy.
5. In **Window 2 (Guest)**:
   - Click **Play with Friends (Party Code)**.
   - Switch to the **Join Party** tab.
   - Enter your nickname (e.g. `Guest`) and type or paste the 6-character code.
   - Click **Join Party**.
6. Both players will appear in the private waiting lobby:
   - Guest clicks **Ready Up**.
   - Host clicks **Start Match!**.
7. The synchronized 3-2-1 countdown will trigger, and the real-time match will begin with server-authoritative physics, scoring, and paddle movement!

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3001`  | Port on which the HTTP / WebSocket server listens |

---

## Deployment Instructions

### Deploying to Render / Railway / Heroku / Fly.io / VPS
1. Set the build command:
   ```bash
   npm run build
   ```
2. Set the start command:
   ```bash
   npm start
   ```
3. Set the `PORT` environment variable to the port provided by your cloud host.
4. The server will host the compiled static frontend at `/` and serve real-time Socket.IO multiplayer over WebSockets on the same port.
