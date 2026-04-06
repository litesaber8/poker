import { Card, EvaluatedHand } from './pokerLogic';

export type Phase = 'waiting' | 'betting' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  cards: Card[];
  chips: number;
  bet: number;
  isFolded: boolean;
  isAllIn: boolean;
  lastAction?: string;
}

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
  phase: Phase;
  dealerIndex: number;
  currentPlayerIndex: number;
  deck: Card[];
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
}

export const INITIAL_CHIPS = 1000;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;

export function getNextPlayerIndex(currentIndex: number, players: Player[]): number {
  let next = (currentIndex + 1) % players.length;
  let count = 0;
  while ((players[next].isFolded || players[next].isAllIn) && count < players.length) {
    next = (next + 1) % players.length;
    count++;
  }
  return next;
}

export function isBettingRoundOver(players: Player[], currentBet: number): boolean {
  const activePlayers = players.filter(p => !p.isFolded);
  // All active players must have matched the current bet or be all-in
  return activePlayers.every(p => p.bet === currentBet || p.isAllIn);
}
