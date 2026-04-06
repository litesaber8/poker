import React from 'react';
import { Card as CardType } from '@/lib/pokerLogic';

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-black',
  spades: 'text-black',
};

interface CardProps {
  card?: CardType;
  hidden?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, hidden }) => {
  if (hidden || !card) {
    return (
      <div className="w-12 h-16 bg-blue-800 border-2 border-white rounded-md flex items-center justify-center shadow-md">
        <div className="w-8 h-12 border border-blue-600 rounded-sm bg-blue-700 opacity-50"></div>
      </div>
    );
  }

  return (
    <div className="w-12 h-16 bg-white border border-gray-300 rounded-md flex flex-col items-center justify-between p-1 shadow-md">
      <div className={`self-start text-xs font-bold ${suitColors[card.suit]}`}>
        {card.rank}
      </div>
      <div className={`text-xl ${suitColors[card.suit]}`}>
        {suitSymbols[card.suit]}
      </div>
      <div className={`self-end text-xs font-bold rotate-180 ${suitColors[card.suit]}`}>
        {card.rank}
      </div>
    </div>
  );
};
