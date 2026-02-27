# 🦁 Ludo Savannah: Functional Repository Documentation

## 1. Project Overview
**Ludo Savannah** is a modern, immersive web-based adaptation of the classic Ludo board game, themed around the vibrant wildlife of the African Savannah. It combines traditional gameplay mechanics with high-quality animations, animal-themed customization, and real-time multiplayer capabilities.

## 2. Core Features
### 🎮 Gameplay Modes
- **Local Multiplayer**: 2-4 players on a single device.
- **Online Battle**: Real-time room-based multiplayer (Socket.io infrastructure).
- **Quick Match**: Fast-paced rules for shorter sessions.
- **Mini Games**: Integrated "Game Zone" for side activities.

### 🦒 Customization
- **Animal Umbrellas**: Players can choose from 6 distinct animal avatars:
  - 🦁 Lion
  - 🦓 Zebra
  - 🦒 Giraffe
  - 🐘 Elephant
  - 🐒 Monkey
  - 🦛 Hippo
- **Team Customization**: In local mode, players can assign specific animals to every participant.

### ✨ Visuals & Audio
- **Dynamic Canvas Board**: High-performance rendering using Konva.js.
- **Sensational Audio**: 
  - Looping dice roll sound for tension.
  - Distinct dice result sounds.
  - Tactile pawn movement and "capture" sounds.
  - Victory fanfare.
- **Responsive Design**: Fluid layout that adapts from mobile to ultra-wide desktop screens.

## 3. Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4.
- **Rendering**: Konva.js (via `react-konva`) for the game board.
- **State Management**: React Hooks (useState, useMemo, useCallback).
- **Animations**: Framer Motion.
- **Audio**: Howler.js.
- **Backend**: Node.js, Express.
- **Real-time**: Socket.io.

## 4. Repository Structure
```text
├── server.ts              # Express + Socket.io server entry point
├── src/
│   ├── App.tsx            # Main application logic & UI
│   ├── main.tsx           # React entry point
│   ├── index.css          # Global styles & Tailwind config
│   ├── types.ts           # Global TypeScript interfaces & enums
│   ├── components/
│   │   └── LudoBoard.tsx  # Canvas-based board component
│   └── logic/
│       └── ludoLogic.ts   # Game rules, pathfinding & coordinate mapping
├── metadata.json          # App metadata & permissions
├── package.json           # Dependencies & scripts
└── tsconfig.json          # TypeScript configuration
```

## 5. Technical Implementation Details
### 🎲 Game Engine
The game uses a logical coordinate system (0-58) mapped to a 15x15 grid.
- **Pathfinding**: `ludoLogic.ts` contains the `BASE_PATH` and `HOME_PATHS` for all four colors.
- **Collision Detection**: Implemented in `App.tsx`, checking for overlapping pawns on non-safe spots.
- **Coordinate Mapping**: `getPawnCoordinates` handles base positions, track movement, and multi-pawn offsets on a single cell.

### 🔌 Real-time Sync
The `server.ts` handles WebSocket connections via Socket.io. It supports:
- Room creation and joining.
- Player state synchronization.
- Action broadcasting for online matches.

## 6. Setup & Installation
1. **Clone the repo**:
   ```bash
   git clone <repository-url>
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run development server**:
   ```bash
   npm run dev
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```

## 7. Game Rules
1. **Starting**: Roll a **6** to move an animal from the base to the starting spot.
2. **Movement**: Move clockwise based on the dice roll.
3. **Capturing**: Land on an opponent's pawn to send it back to their base and earn an extra roll.
4. **Safe Spots**: Cells marked with a star (★) prevent pawns from being captured.
5. **Winning**: Navigate all 4 animals through the home path to the center "HOME" square.

## 8. Future Roadmap
- [ ] **AI Opponents**: Implement smart bot logic for single-player mode.
- [ ] **Global Leaderboards**: Track wins and "kills" globally.
- [ ] **Animal Abilities**: Unique (optional) perks for different animal types.
- [ ] **Themed Boards**: Jungle, Desert, and Oasis variations.

---
*Developed with ❤️ for the Ludo Savannah Community.*
