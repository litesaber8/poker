import { useState, useEffect, useCallback } from 'react';
import { Card, createDeck, shuffleDeck, evaluateHand, HAND_RANK_VALUE } from './pokerLogic';
import { GameState, Player, Phase, INITIAL_CHIPS, SMALL_BLIND, BIG_BLIND, getNextPlayerIndex, isBettingRoundOver } from './gameState';

export function usePokerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startNewGame = (playerCount: number, botCount: number) => {
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: `p${i}`,
        name: `Player ${i + 1}`,
        isBot: false,
        cards: [],
        chips: INITIAL_CHIPS,
        bet: 0,
        isFolded: false,
        isAllIn: false,
      });
    }
    for (let i = 0; i < botCount; i++) {
      players.push({
        id: `b${i}`,
        name: `Bot ${i + 1}`,
        isBot: true,
        cards: [],
        chips: INITIAL_CHIPS,
        bet: 0,
        isFolded: false,
        isAllIn: false,
      });
    }

    const deck = shuffleDeck(createDeck());
    const dealerIndex = 0;
    
    // Initial State
    setGameState({
      players,
      communityCards: [],
      pot: 0,
      phase: 'betting',
      dealerIndex,
      currentPlayerIndex: (dealerIndex + 3) % players.length,
      deck,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      currentBet: BIG_BLIND,
    });

    dealInitialCards(players, deck, dealerIndex);
  };

  const dealInitialCards = (players: Player[], deck: Card[], dealerIndex: number) => {
    const newDeck = [...deck];
    const newPlayers = players.map(p => ({ ...p, cards: [newDeck.pop()!, newDeck.pop()!] }));
    
    // Pay blinds
    const sbIndex = (dealerIndex + 1) % newPlayers.length;
    const bbIndex = (dealerIndex + 2) % newPlayers.length;
    
    newPlayers[sbIndex].chips -= SMALL_BLIND;
    newPlayers[sbIndex].bet = SMALL_BLIND;
    newPlayers[bbIndex].chips -= BIG_BLIND;
    newPlayers[bbIndex].bet = BIG_BLIND;

    setGameState(prev => prev ? {
      ...prev,
      players: newPlayers,
      deck: newDeck,
      pot: SMALL_BLIND + BIG_BLIND,
    } : null);
  };

  const handleAction = (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
    if (!gameState) return;

    const { players, currentPlayerIndex, currentBet, pot, phase } = gameState;
    const currentPlayer = players[currentPlayerIndex];
    let newPlayers = [...players];
    let newPot = pot;
    let newCurrentBet = currentBet;
    let nextPhase = phase;

    switch (action) {
      case 'fold':
        newPlayers[currentPlayerIndex].isFolded = true;
        newPlayers[currentPlayerIndex].lastAction = 'Fold';
        break;
      case 'check':
        newPlayers[currentPlayerIndex].lastAction = 'Check';
        break;
      case 'call':
        const callAmount = currentBet - currentPlayer.bet;
        newPlayers[currentPlayerIndex].chips -= callAmount;
        newPlayers[currentPlayerIndex].bet += callAmount;
        newPot += callAmount;
        newPlayers[currentPlayerIndex].lastAction = 'Call';
        break;
      case 'raise':
        if (amount) {
          const raiseAmount = amount - currentPlayer.bet;
          newPlayers[currentPlayerIndex].chips -= raiseAmount;
          newPlayers[currentPlayerIndex].bet += raiseAmount;
          newPot += raiseAmount;
          newCurrentBet = amount;
          newPlayers[currentPlayerIndex].lastAction = `Raise to ${amount}`;
        }
        break;
    }

    const nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, newPlayers);
    
    // Check if betting round is over
    if (isBettingRoundOver(newPlayers, newCurrentBet)) {
      moveToNextPhase(newPlayers, newPot, newCurrentBet, phase);
    } else {
      setGameState({
        ...gameState,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        pot: newPot,
        currentBet: newCurrentBet,
      });
    }
  };

  const moveToNextPhase = (players: Player[], pot: number, currentBet: number, currentPhase: Phase) => {
    if (!gameState) return;
    
    let nextPhase: Phase = 'betting';
    let newCommunityCards = [...gameState.communityCards];
    let newDeck = [...gameState.deck];
    let resetPlayers = players.map(p => ({ ...p, bet: 0, lastAction: undefined }));

    if (currentPhase === 'betting') {
      nextPhase = 'flop';
      newCommunityCards.push(newDeck.pop()!, newDeck.pop()!, newDeck.pop()!);
    } else if (currentPhase === 'flop') {
      nextPhase = 'turn';
      newCommunityCards.push(newDeck.pop()!);
    } else if (currentPhase === 'turn') {
      nextPhase = 'river';
      newCommunityCards.push(newDeck.pop()!);
    } else if (currentPhase === 'river') {
      nextPhase = 'showdown';
    }

    if (nextPhase === 'showdown') {
      determineWinner(resetPlayers, newCommunityCards, pot);
    } else {
      setGameState({
        ...gameState,
        players: resetPlayers,
        communityCards: newCommunityCards,
        deck: newDeck,
        phase: nextPhase,
        pot,
        currentBet: 0,
        currentPlayerIndex: getNextPlayerIndex(gameState.dealerIndex, resetPlayers),
      });
    }
  };

  const determineWinner = (players: Player[], communityCards: Card[], pot: number) => {
    const activePlayers = players.filter(p => !p.isFolded);
    const evaluations = activePlayers.map(p => ({
      player: p,
      evaluation: evaluateHand([...p.cards, ...communityCards])
    }));

    evaluations.sort((a, b) => b.evaluation.value - a.evaluation.value);
    
    const winner = evaluations[0].player;
    const newPlayers = players.map(p => {
      if (p.id === winner.id) {
        return { ...p, chips: p.chips + pot, lastAction: `Winner: ${evaluations[0].evaluation.rank}` };
      }
      return p;
    });

    setGameState(prev => prev ? {
      ...prev,
      players: newPlayers,
      phase: 'showdown',
      pot: 0,
    } : null);
  };

  // Bot logic
  useEffect(() => {
    if (gameState && gameState.phase !== 'showdown' && gameState.players[gameState.currentPlayerIndex].isBot) {
      const timer = setTimeout(() => {
        const { currentBet, players, currentPlayerIndex } = gameState;
        const bot = players[currentPlayerIndex];
        const callAmount = currentBet - bot.bet;
        
        if (callAmount === 0) {
          handleAction('check');
        } else if (bot.chips >= callAmount) {
          handleAction('call');
        } else {
          handleAction('fold');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  return { gameState, startNewGame, handleAction };
}
