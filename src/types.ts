export type AnimalType = 'Lion' | 'Zebra' | 'Giraffe' | 'Elephant' | 'Monkey' | 'Hippo';

export interface Player {
  id: string;
  name: string;
  animal: AnimalType;
  color: string;
  isBot?: boolean;
}

export interface Pawn {
  id: string;
  ownerId: string;
  position: number; // -1 for home base, 0-51 for main track, 52-57 for home path, 58 for finished
  color: string;
}

export interface GameState {
  players: Player[];
  pawns: Pawn[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  lastAction: string | null;
}

export const BOARD_COLORS = {
  red: '#e11d48',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  bg: '#f5f5f4', // Warm stone/savannah background
  grid: '#44403c',
};

export const ANIMALS: Record<AnimalType, string> = {
  Lion: '🦁',
  Zebra: '🦓',
  Giraffe: '🦒',
  Elephant: '🐘',
  Monkey: '🐒',
  Hippo: '🦛',
};
