import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice5, Users, Trophy, Settings, Play, Info, Volume2, VolumeX, Home, ArrowLeft, Sparkles } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import LudoBoard from './components/LudoBoard';
import { Player, Pawn, GameState, AnimalType, ANIMALS, BOARD_COLORS } from './types';
import { INITIAL_PAWNS, rollDice, canMovePawn, movePawn } from './logic/ludoLogic';
import { Howl } from 'howler';

const socket: Socket = io();

// Sounds
const rollingSound = new Howl({ 
  src: ['https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'],
  loop: true,
  volume: 0.5
});
const diceResultSound = new Howl({ 
  src: ['https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3'],
  volume: 0.8
});
const moveSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3'] });
const killSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2006/2006-preview.mp3'] });
const winSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2007/2007-preview.mp3'] });

export default function App() {
  const [view, setView] = useState<'menu' | 'lobby' | 'game' | 'animal-select'>('menu');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [numPlayersSelect, setNumPlayersSelect] = useState(2);
  const [playerAnimals, setPlayerAnimals] = useState<AnimalType[]>(['Lion', 'Zebra', 'Giraffe', 'Elephant']);
  const [activeSlot, setActiveSlot] = useState(0);

  const currentPlayer = useMemo(() => {
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex];
  }, [gameState]);

  const canMovePawnIds = useMemo(() => {
    if (!gameState || gameState.diceValue === null || gameState.isRolling) return [];
    const currentP = gameState.players[gameState.currentPlayerIndex];
    return gameState.pawns
      .filter(p => p.ownerId === currentP.id && canMovePawn(p, gameState.diceValue!))
      .map(p => p.id);
  }, [gameState]);

  useEffect(() => {
    socket.on('room-update', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      socket.off('room-update');
    };
  }, []);

  const startLocalGame = (num: number) => {
    const localPlayers: Player[] = Array.from({ length: num }).map((_, i) => ({
      id: `local-${i}`,
      name: i === 0 ? 'You' : `Player ${i + 1}`,
      animal: playerAnimals[i],
      color: Object.keys(BOARD_COLORS)[i % 4],
    }));
    
    setPlayers(localPlayers);
    setGameState({
      players: localPlayers,
      pawns: INITIAL_PAWNS(localPlayers),
      currentPlayerIndex: 0,
      diceValue: null,
      isRolling: false,
      status: 'playing',
      winner: null,
      lastAction: 'Game Started! Roll the dice.',
    });
    setView('game');
  };

  const handleDiceRoll = () => {
    if (!gameState || gameState.isRolling || gameState.diceValue !== null) return;
    
    if (soundEnabled) rollingSound.play();
    setGameState(prev => prev ? { ...prev, isRolling: true } : null);
    
    setTimeout(() => {
      if (soundEnabled) {
        rollingSound.stop();
        diceResultSound.play();
      }
      const value = rollDice();
      setGameState(prev => {
        if (!prev) return null;
        
        // Check if player can move any pawn
        const currentP = prev.players[prev.currentPlayerIndex];
        const movablePawns = prev.pawns.filter(p => p.ownerId === currentP.id && canMovePawn(p, value));
        
        let nextState = { 
          ...prev, 
          isRolling: false, 
          diceValue: value,
          lastAction: `Rolled a ${value}!`
        };

        if (movablePawns.length === 0) {
          nextState.lastAction = `Rolled a ${value}. No moves possible!`;
          // Auto-skip turn after a delay
          setTimeout(() => switchTurn(), 1500);
        }

        return nextState;
      });
    }, 800);
  };

  const switchTurn = () => {
    setGameState(prev => {
      if (!prev) return null;
      const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      return {
        ...prev,
        currentPlayerIndex: nextIndex,
        diceValue: null,
        lastAction: `${prev.players[nextIndex].name}'s turn`
      };
    });
  };

  const handlePawnClick = (pawnId: string) => {
    if (!gameState || gameState.diceValue === null) return;
    
    const pawn = gameState.pawns.find(p => p.id === pawnId);
    if (!pawn || pawn.ownerId !== currentPlayer?.id) return;
    if (!canMovePawn(pawn, gameState.diceValue)) return;

    if (soundEnabled) moveSound.play();

    setGameState(prev => {
      if (!prev || prev.diceValue === null) return null;
      
      const movedPawn = movePawn(pawn, prev.diceValue);
      let newPawns = prev.pawns.map(p => p.id === pawnId ? movedPawn : p);

      // Collision detection (Kill)
      // Only if not in safe spot or home
      const isSafeSpot = (pos: number) => [0, 8, 13, 21, 26, 34, 39, 47].includes(pos); // Simplified safe spots
      
      if (movedPawn.position >= 0 && movedPawn.position <= 51 && !isSafeSpot(movedPawn.position)) {
        const opponentPawn = newPawns.find(p => 
          p.ownerId !== movedPawn.ownerId && 
          p.position === movedPawn.position &&
          p.position !== -1
        );

        if (opponentPawn) {
          if (soundEnabled) killSound.play();
          newPawns = newPawns.map(p => p.id === opponentPawn.id ? { ...p, position: -1 } : p);
          // Player gets another turn for a kill
          return {
            ...prev,
            pawns: newPawns,
            diceValue: null,
            lastAction: `BOOM! ${prev.players[prev.currentPlayerIndex].name} killed a pawn!`
          };
        }
      }

      // Check win condition
      const playerPawns = newPawns.filter(p => p.ownerId === movedPawn.ownerId);
      if (playerPawns.every(p => p.position === 58)) {
        if (soundEnabled) winSound.play();
        return {
          ...prev,
          pawns: newPawns,
          status: 'finished',
          winner: movedPawn.ownerId,
          lastAction: `${prev.players[prev.currentPlayerIndex].name} WINS!`
        };
      }

      // If rolled a 6, get another turn
      if (prev.diceValue === 6) {
        return {
          ...prev,
          pawns: newPawns,
          diceValue: null,
          lastAction: `Rolled a 6! One more turn.`
        };
      }

      // Switch turn
      const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      return {
        ...prev,
        pawns: newPawns,
        currentPlayerIndex: nextIndex,
        diceValue: null,
        lastAction: `${prev.players[nextIndex].name}'s turn`
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-stone-900 font-sans overflow-hidden selection:bg-orange-200">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-10 left-10 text-9xl">🦒</div>
        <div className="absolute bottom-20 right-10 text-9xl">🐘</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem]">🦁</div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <div className="w-32 h-32 bg-orange-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-12">
                <Dice5 className="w-16 h-16 text-white" />
              </div>
            </motion.div>

            <motion.h1 
              className="text-7xl md:text-9xl font-black text-stone-800 mb-2 tracking-tighter"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              LUDO<span className="text-orange-600">SAVANNAH</span>
            </motion.h1>
            <p className="text-stone-500 mb-12 font-medium uppercase tracking-widest text-sm">The Wildest Board Game Experience</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              <MenuButton 
                icon={<Users className="w-6 h-6" />} 
                label="Local Multiplayer" 
                sub="Play with friends on one device"
                onClick={() => setView('animal-select')}
                color="bg-orange-500"
              />
              <MenuButton 
                icon={<Trophy className="w-6 h-6" />} 
                label="Online Battle" 
                sub="Challenge the world"
                onClick={() => setView('lobby')}
                color="bg-emerald-600"
              />
              <MenuButton 
                icon={<Sparkles className="w-6 h-6" />} 
                label="Game Zone" 
                sub="Mini-games & More"
                onClick={() => {}}
                color="bg-blue-600"
              />
              <MenuButton 
                icon={<Settings className="w-6 h-6" />} 
                label="Settings" 
                sub="Customize your experience"
                onClick={() => {}}
                color="bg-stone-700"
              />
            </div>

            <div className="mt-12 flex gap-4">
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-4 rounded-full bg-white shadow-lg hover:scale-110 transition-transform"
              >
                {soundEnabled ? <Volume2 /> : <VolumeX />}
              </button>
              <button className="p-4 rounded-full bg-white shadow-lg hover:scale-110 transition-transform">
                <Info />
              </button>
            </div>
          </motion.div>
        )}

        {view === 'animal-select' && (
          <motion.div
            key="animal-select"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            <h2 className="text-4xl font-black mb-8">Customize Your Team</h2>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {Array.from({ length: numPlayersSelect }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlot(i)}
                  className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-2 ${activeSlot === i ? 'bg-white border-orange-500 scale-110 shadow-xl' : 'bg-white/50 border-transparent opacity-60'}`}
                >
                  <span className="text-5xl">{ANIMALS[playerAnimals[i]]}</span>
                  <span className="text-xs font-black uppercase text-stone-400">P{i + 1}</span>
                </button>
              ))}
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-xl w-full max-w-2xl">
              <div className="mb-8">
                <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-4 text-center">Select Animal for P{activeSlot + 1}</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {(Object.keys(ANIMALS) as AnimalType[]).map((animal) => (
                    <button
                      key={animal}
                      onClick={() => {
                        const newAnimals = [...playerAnimals];
                        newAnimals[activeSlot] = animal;
                        setPlayerAnimals(newAnimals);
                      }}
                      className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${playerAnimals[activeSlot] === animal ? 'bg-orange-500 text-white shadow-lg scale-105' : 'bg-stone-50 hover:bg-stone-100'}`}
                    >
                      <span className="text-3xl">{ANIMALS[animal]}</span>
                      <span className="text-[8px] font-bold uppercase">{animal}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Players</h3>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          setNumPlayersSelect(n);
                          if (activeSlot >= n) setActiveSlot(0);
                        }}
                        className={`flex-1 py-3 rounded-xl font-black transition-all ${numPlayersSelect === n ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-400'}`}
                      >
                        {n}P
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => startLocalGame(numPlayersSelect)}
                    className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-3"
                  >
                    <Play className="fill-current w-5 h-5" /> START
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setView('menu')}
              className="mt-8 text-stone-400 font-bold hover:text-stone-600 transition-colors"
            >
              Back to Menu
            </button>
          </motion.div>
        )}

        {view === 'game' && gameState && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-screen p-4 gap-8"
          >
            {/* Game UI - Left Sidebar */}
            <div className="flex flex-col gap-4 w-full lg:w-64 order-2 lg:order-1">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-b-4 border-stone-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-xl">Players</h2>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full">CLASSIC</span>
                </div>
                <div className="space-y-3">
                  {gameState.players.map((p, i) => {
                    const isCurrentTurn = gameState.currentPlayerIndex === i;
                    return (
                      <div 
                        key={p.id} 
                        className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-500 ${isCurrentTurn ? 'bg-white ring-4 ring-orange-500 scale-105 shadow-2xl z-10' : 'bg-stone-50/50 opacity-40 grayscale-[0.5]'}`}
                      >
                        {isCurrentTurn && (
                          <motion.div 
                            layoutId="active-glow"
                            className="absolute inset-0 bg-orange-500/10 rounded-2xl"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        )}
                        <div className={`text-3xl w-12 h-12 flex items-center justify-center rounded-xl shadow-inner transition-transform ${isCurrentTurn ? 'scale-110 rotate-3' : ''}`} style={{ backgroundColor: isCurrentTurn ? 'white' : '#f5f5f4' }}>
                          {ANIMALS[p.animal]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className={`font-black text-sm truncate ${isCurrentTurn ? 'text-stone-900' : 'text-stone-500'}`}>{p.name}</div>
                            {isCurrentTurn && (
                              <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full"
                              >
                                ACTIVE
                              </motion.span>
                            )}
                          </div>
                          <div className="w-full bg-stone-100 h-2 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full transition-all duration-500" 
                              style={{ 
                                width: `${(gameState.pawns.filter(pawn => pawn.ownerId === p.id && pawn.position === 58).length / 4) * 100}%`, 
                                backgroundColor: BOARD_COLORS[p.color as keyof typeof BOARD_COLORS] 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-stone-800 p-6 rounded-[2.5rem] text-white shadow-xl">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Game Log</h3>
                <div className="text-sm font-medium h-20 overflow-y-auto scrollbar-hide">
                  <p className="text-orange-400">🐾 {gameState.lastAction}</p>
                </div>
              </div>

              <button 
                onClick={() => setView('menu')}
                className="flex items-center justify-center gap-2 p-5 bg-white text-stone-800 rounded-[2rem] hover:bg-stone-50 transition-all font-black shadow-lg border-b-4 border-stone-200"
              >
                <ArrowLeft className="w-5 h-5" /> QUIT GAME
              </button>
            </div>

            {/* Main Board Area */}
            <div className="flex flex-col items-center gap-6 order-1 lg:order-2">
              <LudoBoard 
                pawns={gameState.pawns} 
                players={gameState.players} 
                onPawnClick={handlePawnClick} 
                currentPlayerId={currentPlayer?.id || ''}
                canMovePawnIds={canMovePawnIds}
              />
              
              {/* Controls */}
              <div className="flex items-center gap-8 bg-white p-5 rounded-[3rem] shadow-2xl border-b-8 border-stone-200">
                <div className="flex flex-col items-center px-6 border-r-2 border-stone-100">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">
                    {gameState.currentPlayerIndex === 0 ? 'Your Turn' : 'Turn'}
                  </span>
                  <div className="relative">
                    <div className="text-4xl animate-bounce">{ANIMALS[gameState.players[gameState.currentPlayerIndex].animal]}</div>
                    {gameState.currentPlayerIndex === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg"
                      >
                        YOU
                      </motion.div>
                    )}
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDiceRoll}
                  disabled={gameState.isRolling || gameState.diceValue !== null}
                  className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-xl transition-all relative overflow-hidden ${gameState.isRolling ? 'bg-stone-100' : (gameState.diceValue !== null ? 'bg-stone-200 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600')}`}
                >
                  {gameState.isRolling ? (
                    <motion.div
                      animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.4, ease: "linear" }}
                    >
                      <Dice5 className="w-12 h-12 text-stone-400" />
                    </motion.div>
                  ) : (
                    <div className="text-5xl font-black text-white">
                      {gameState.diceValue || '?'}
                    </div>
                  )}
                  {gameState.diceValue === null && !gameState.isRolling && (
                    <motion.div 
                      className="absolute inset-0 bg-white/20"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                </motion.button>

                <div className="flex flex-col items-start px-6 min-w-[120px]">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Action</span>
                  <div className="text-lg font-black text-stone-700 leading-tight">
                    {gameState.diceValue !== null && canMovePawnIds.length > 0 
                      ? 'SELECT PAWN' 
                      : (gameState.diceValue !== null ? 'NO MOVES' : 'ROLL DICE')}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner Modal */}
      <AnimatePresence>
        {gameState?.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[4rem] p-12 flex flex-col items-center text-center shadow-2xl max-w-md w-full"
            >
              <div className="text-9xl mb-6">🏆</div>
              <h2 className="text-5xl font-black mb-2">VICTORY!</h2>
              <p className="text-stone-500 font-bold mb-8 uppercase tracking-widest">
                {gameState.players.find(p => p.id === gameState.winner)?.name} is the Savannah King!
              </p>
              <div className="text-6xl mb-8">
                {ANIMALS[gameState.players.find(p => p.id === gameState.winner)?.animal || 'Lion']}
              </div>
              <button
                onClick={() => setView('menu')}
                className="w-full py-5 bg-orange-500 text-white rounded-3xl font-black text-xl shadow-lg hover:bg-orange-600 transition-all"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ icon, label, sub, onClick, color }: { icon: React.ReactNode, label: string, sub: string, onClick: () => void, color: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-4 p-6 bg-white rounded-[2.5rem] shadow-xl border-b-4 border-stone-200 text-left group transition-all hover:shadow-2xl"
    >
      <div className={`p-5 rounded-[1.5rem] ${color} text-white group-hover:scale-110 transition-transform shadow-lg`}>
        {icon}
      </div>
      <div>
        <div className="font-black text-2xl text-stone-800 tracking-tight">{label}</div>
        <div className="text-stone-400 text-sm font-bold uppercase tracking-wider">{sub}</div>
      </div>
    </motion.button>
  );
}
