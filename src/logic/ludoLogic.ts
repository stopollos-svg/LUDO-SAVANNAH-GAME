import { Pawn, Player } from "../types";

export const BOARD_SIZE = 15;
export const CELL_SIZE = 40;

// Path for each color starting from their respective start positions
const BASE_PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0]
];

// Home paths for each color
const HOME_PATHS: Record<string, number[][]> = {
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Base positions (where pawns stay when not in play)
const BASE_POSITIONS: Record<string, number[][]> = {
  yellow: [[10, 1], [10, 4], [13, 1], [13, 4]],
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  blue: [[10, 10], [10, 13], [13, 10], [13, 13]],
};

// Start indices on the BASE_PATH for each color
const START_OFFSETS: Record<string, number> = {
  yellow: 40,
  red: 1,
  green: 14,
  blue: 27,
};

export const getPawnCoordinates = (pawn: Pawn, pawnIndex: number, allPawns: Pawn[]) => {
  let coords = [0, 0];

  if (pawn.position === -1) {
    // In base
    coords = BASE_POSITIONS[pawn.color][pawnIndex % 4];
  } else if (pawn.position >= 0 && pawn.position <= 51) {
    // On main track
    const offset = START_OFFSETS[pawn.color];
    const index = (pawn.position + offset) % 52;
    coords = BASE_PATH[index];
  } else if (pawn.position >= 52 && pawn.position <= 57) {
    // In home path
    coords = HOME_PATHS[pawn.color][pawn.position - 52];
  } else if (pawn.position === 58) {
    // Finished (center)
    coords = [7, 7];
  }

  // Offset if multiple pawns are on the same cell
  const pawnsOnSameCell = allPawns.filter(p => p.position === pawn.position && p.position !== -1 && p.position !== 58);
  const sameCellIndex = pawnsOnSameCell.findIndex(p => p.id === pawn.id);
  
  let offsetX = 0;
  let offsetY = 0;
  
  if (pawnsOnSameCell.length > 1 && sameCellIndex !== -1) {
    const angle = (sameCellIndex / pawnsOnSameCell.length) * Math.PI * 2;
    offsetX = Math.cos(angle) * 8;
    offsetY = Math.sin(angle) * 8;
  }

  return {
    x: coords[1] * CELL_SIZE + CELL_SIZE / 2 + offsetX,
    y: coords[0] * CELL_SIZE + CELL_SIZE / 2 + offsetY
  };
};

export const rollDice = () => Math.floor(Math.random() * 6) + 1;

export const INITIAL_PAWNS = (players: Player[]): Pawn[] => {
  const pawns: Pawn[] = [];
  players.forEach((player) => {
    for (let i = 0; i < 4; i++) {
      pawns.push({
        id: `${player.id}-pawn-${i}`,
        ownerId: player.id,
        position: -1,
        color: player.color,
      });
    }
  });
  return pawns;
};

export const canMovePawn = (pawn: Pawn, diceValue: number): boolean => {
  if (pawn.position === 58) return false; // Already finished
  if (pawn.position === -1 && diceValue !== 6) return false; // Need a 6 to start
  if (pawn.position >= 52 && pawn.position + diceValue > 58) return false; // Cannot overshoot home
  return true;
};

export const movePawn = (pawn: Pawn, diceValue: number): Pawn => {
  let newPos = pawn.position;
  if (pawn.position === -1) {
    if (diceValue === 6) newPos = 0;
  } else {
    newPos += diceValue;
  }
  return { ...pawn, position: newPos };
};
