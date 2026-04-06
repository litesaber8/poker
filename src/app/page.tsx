'use client';

import { useState } from 'react';
import { usePokerGame } from '@/lib/usePokerGame';
import { Card } from '@/components/Card';

export default function PokerGame() {
  const { gameState, startNewGame, handleAction } = usePokerGame();
  const [playerCount, setPlayerCount] = useState(1);
  const [botCount, setBotCount] = useState(3);
  const [showCards, setShowCards] = useState(false);

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-4">
        <h1 className="text-4xl font-bold mb-8">Poker Game</h1>
        <div className="bg-green-800 p-8 rounded-xl shadow-2xl border-4 border-green-700">
          <div className="mb-4">
            <label className="block mb-2">Human Players: {playerCount}</label>
            <input 
              type="range" min="1" max="4" value={playerCount} 
              onChange={(e) => setPlayerCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2">Bots: {botCount}</label>
            <input 
              type="range" min="0" max="6" value={botCount} 
              onChange={(e) => setBotCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <button 
            onClick={() => startNewGame(playerCount, botCount)}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = !currentPlayer.isBot && gameState.phase !== 'showdown';

  return (
    <div className="flex flex-col items-center min-h-screen bg-green-900 text-white p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full flex justify-between mb-4 px-4">
        <div className="bg-black/30 p-2 rounded-lg">Pot: <span className="font-bold text-yellow-400">${gameState.pot}</span></div>
        <div className="bg-black/30 p-2 rounded-lg">Phase: <span className="uppercase font-bold">{gameState.phase}</span></div>
      </div>

      {/* Table */}
      <div className="relative w-full max-w-4xl aspect-[2/1] bg-green-800 rounded-[200px] border-[12px] border-amber-900 shadow-2xl flex flex-col items-center justify-center my-8">
        {/* Community Cards */}
        <div className="flex gap-2 mb-4">
          {gameState.communityCards.map((card, i) => (
            <Card key={i} card={card} />
          ))}
          {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
            <div key={i} className="w-12 h-16 border-2 border-green-700 rounded-md opacity-20"></div>
          ))}
        </div>

        {/* Players */}
        {gameState.players.map((player, i) => {
          const angle = (i / gameState.players.length) * 2 * Math.PI + Math.PI/2;
          const x = 45 * Math.cos(angle);
          const y = 40 * Math.sin(angle);
          const isCurrent = gameState.currentPlayerIndex === i;

          return (
            <div 
              key={player.id}
              className={`absolute flex flex-col items-center transition-all duration-500 ${isCurrent ? 'scale-110' : 'scale-90 opacity-80'}`}
              style={{ left: `${50 + x}%`, top: `${50 + y}%`, transform: `translate(-50%, -50%)` }}
            >
              <div className={`p-2 rounded-lg flex flex-col items-center ${isCurrent ? 'bg-yellow-500 text-black ring-4 ring-white' : 'bg-black/50 text-white'}`}>
                <span className="text-xs font-bold whitespace-nowrap">{player.name} {player.isBot ? '(BOT)' : ''}</span>
                <span className="text-sm">${player.chips}</span>
                {player.lastAction && (
                  <span className="text-[10px] bg-white/20 px-1 rounded mt-1">{player.lastAction}</span>
                )}
              </div>
              
              <div className="flex gap-1 mt-1">
                {player.cards.map((card, ci) => (
                  <Card 
                    key={ci} 
                    card={card} 
                    hidden={gameState.phase !== 'showdown' && (player.isBot || (player.id !== currentPlayer.id) || !showCards)} 
                  />
                ))}
              </div>
              
              {player.bet > 0 && (
                <div className="absolute -top-8 bg-blue-600 text-[10px] px-2 rounded-full border border-white">
                  Bet: ${player.bet}
                </div>
              )}
              
              {player.isFolded && (
                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center z-10">
                   <span className="font-bold text-red-500 rotate-12">FOLDED</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-auto w-full max-w-2xl bg-black/40 p-6 rounded-t-3xl border-t-2 border-white/10">
        {!isHumanTurn ? (
          <div className="text-center italic animate-pulse">
            {gameState.phase === 'showdown' ? 'Winner Revealed!' : `Waiting for ${currentPlayer.name}...`}
            {gameState.phase === 'showdown' && (
               <button 
               onClick={() => startNewGame(playerCount, botCount)}
               className="block mx-auto mt-4 bg-yellow-500 text-black px-8 py-2 rounded-full font-bold"
             >
               PLAY AGAIN
             </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center font-bold text-yellow-400">
               GILIRAN: {currentPlayer.name} - Lihat Kartu Anda!
            </div>
            
            <div className="flex justify-center gap-2">
              {!showCards ? (
                <button 
                  onClick={() => setShowCards(true)}
                  className="bg-blue-500 px-8 py-3 rounded-lg font-bold w-full"
                >
                  LIHAT KARTU SAYA
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => { handleAction('fold'); setShowCards(false); }}
                    className="bg-red-600 px-4 py-3 rounded-lg font-bold flex-1"
                  >
                    FOLD
                  </button>
                  {gameState.currentBet === currentPlayer.bet ? (
                    <button 
                      onClick={() => { handleAction('check'); setShowCards(false); }}
                      className="bg-gray-500 px-4 py-3 rounded-lg font-bold flex-1"
                    >
                      CHECK
                    </button>
                  ) : (
                    <button 
                      onClick={() => { handleAction('call'); setShowCards(false); }}
                      className="bg-green-600 px-4 py-3 rounded-lg font-bold flex-1"
                    >
                      CALL ${gameState.currentBet - currentPlayer.bet}
                    </button>
                  )}
                  <button 
                    onClick={() => { handleAction('raise', gameState.currentBet + 50); setShowCards(false); }}
                    className="bg-yellow-500 text-black px-4 py-3 rounded-lg font-bold flex-1"
                  >
                    RAISE $50
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
