import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';
import { BOARD_COLORS, Pawn, Player, ANIMALS } from '../types';
import { CELL_SIZE, BOARD_SIZE, getPawnCoordinates } from '../logic/ludoLogic';

interface LudoBoardProps {
  pawns: Pawn[];
  players: Player[];
  onPawnClick: (pawnId: string) => void;
  currentPlayerId: string;
  canMovePawnIds: string[];
}

const BOARD_DIM = CELL_SIZE * BOARD_SIZE;

const LudoBoard: React.FC<LudoBoardProps> = ({ pawns, players, onPawnClick, currentPlayerId, canMovePawnIds }) => {
  const [dimensions, setDimensions] = useState({ width: BOARD_DIM, height: BOARD_DIM });

  useEffect(() => {
    const updateSize = () => {
      const size = Math.min(window.innerWidth - 40, 600);
      setDimensions({ width: size, height: size });
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const scale = dimensions.width / BOARD_DIM;

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        let fill = 'white';
        let stroke = '#e5e7eb';

        // Home areas (Bases)
        if (i < 6 && j < 6) fill = BOARD_COLORS.red + '15';
        if (i < 6 && j > 8) fill = BOARD_COLORS.green + '15';
        if (i > 8 && j < 6) fill = BOARD_COLORS.yellow + '15';
        if (i > 8 && j > 8) fill = BOARD_COLORS.blue + '15';

        // Home paths
        if (i === 7 && j > 0 && j < 7) fill = BOARD_COLORS.yellow;
        if (i === 7 && j > 7 && j < 14) fill = BOARD_COLORS.green;
        if (j === 7 && i > 0 && i < 7) fill = BOARD_COLORS.red;
        if (j === 7 && i > 7 && i < 14) fill = BOARD_COLORS.blue;

        // Starting spots
        if (i === 8 && j === 1) fill = BOARD_COLORS.yellow;
        if (i === 1 && j === 6) fill = BOARD_COLORS.red;
        if (i === 6 && j === 13) fill = BOARD_COLORS.green;
        if (i === 13 && j === 8) fill = BOARD_COLORS.blue;

        // Safe spots (Stars)
        const isSafe = (i === 8 && j === 1) || (i === 1 && j === 6) || (i === 6 && j === 13) || (i === 13 && j === 8) ||
                       (i === 6 && j === 2) || (i === 2 && j === 8) || (i === 8 && j === 12) || (i === 12 && j === 6);

        cells.push(
          <Group key={`${i}-${j}`}>
            <Rect
              x={j * CELL_SIZE}
              y={i * CELL_SIZE}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.5}
            />
            {isSafe && (
              <Text
                text="★"
                x={j * CELL_SIZE + 12}
                y={i * CELL_SIZE + 12}
                fontSize={16}
                fill="#9ca3af"
              />
            )}
          </Group>
        );
      }
    }
    return cells;
  };

  return (
    <div className="flex justify-center items-center p-4 bg-stone-200 rounded-[2.5rem] shadow-2xl border-[12px] border-stone-800">
      <Stage width={dimensions.width} height={dimensions.height} scaleX={scale} scaleY={scale}>
        <Layer>
          {renderGrid()}
          
          {/* Center Home */}
          <Rect x={6*CELL_SIZE} y={6*CELL_SIZE} width={3*CELL_SIZE} height={3*CELL_SIZE} fill="#44403c" />
          <Text text="HOME" x={6.5*CELL_SIZE} y={7.2*CELL_SIZE} fill="white" fontSize={20} fontStyle="bold" />

          {/* Pawns */}
          {pawns.map((pawn, index) => {
            const { x, y } = getPawnCoordinates(pawn, index, pawns);
            const isSelectable = canMovePawnIds.includes(pawn.id);
            const player = players.find(p => p.id === pawn.ownerId);

            return (
              <Group 
                key={pawn.id} 
                x={x} 
                y={y} 
                onClick={() => isSelectable && onPawnClick(pawn.id)}
                onTap={() => isSelectable && onPawnClick(pawn.id)}
                style={{ cursor: isSelectable ? 'pointer' : 'default' }}
              >
                {isSelectable && (
                  <Circle
                    radius={24}
                    fill={pawn.color}
                    opacity={0.2}
                    stroke={pawn.color}
                    strokeWidth={2}
                  />
                )}
                
                {/* Pawn Base */}
                <Circle
                  radius={18}
                  fill="white"
                  stroke={pawn.color}
                  strokeWidth={4}
                  shadowBlur={isSelectable ? 15 : 4}
                  shadowColor={pawn.color}
                  shadowOpacity={0.6}
                />
                
                {/* Animal Emoji */}
                <Text
                  text={player ? ANIMALS[player.animal] : '🐾'}
                  fontSize={22}
                  x={-11}
                  y={-11}
                  shadowBlur={2}
                  shadowColor="rgba(0,0,0,0.3)"
                />
                
                {/* Active Indicator */}
                {isSelectable && (
                  <Circle
                    radius={20}
                    stroke={pawn.color}
                    strokeWidth={2}
                    dash={[4, 4]}
                  />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default LudoBoard;
