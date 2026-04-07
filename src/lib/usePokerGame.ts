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
    
    const sbIndex = (dealerIndex + 1) % players.length;
    const bbIndex = (dealerIndex + 2) % players.length;
    
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

    dealInitialCards(players, deck, sbIndex, bbIndex);
  };

  const dealInitialCards = (players: Player[], deck: Card[], sbIndex: number, bbIndex: number) => {
    const newDeck = [...deck];
    const newPlayers = players.map(p => ({ ...p, cards: [newDeck.pop()!, newDeck.pop()!] }));
    
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
        const actualCall = Math.min(callAmount, currentPlayer.chips);
        newPlayers[currentPlayerIndex].chips -= actualCall;
        newPlayers[currentPlayerIndex].bet += actualCall;
        newPot += actualCall;
        newPlayers[currentPlayerIndex].lastAction = actualCall < callAmount ? 'All-In (Call)' : 'Call';
        if (newPlayers[currentPlayerIndex].chips === 0) {
          newPlayers[currentPlayerIndex].isAllIn = true;
        }
        break;
      case 'raise':
        if (amount) {
          const raiseAmount = amount - currentPlayer.bet;
          const actualRaise = Math.min(raiseAmount, currentPlayer.chips);
          newPlayers[currentPlayerIndex].chips -= actualRaise;
          newPlayers[currentPlayerIndex].bet += actualRaise;
          newPot += actualRaise;
          newCurrentBet = newPlayers[currentPlayerIndex].bet;
          newPlayers[currentPlayerIndex].lastAction = actualRaise < raiseAmount ? `All-In (Raise to ${newCurrentBet})` : `Raise to ${newCurrentBet}`;
          if (newPlayers[currentPlayerIndex].chips === 0) {
            newPlayers[currentPlayerIndex].isAllIn = true;
          }
        }
        break;
    }

    const nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, newPlayers);
    
    // Check if only one player left
    const activePlayersCount = newPlayers.filter(p => !p.isFolded).length;
    if (activePlayersCount === 1) {
       handleOnePlayerLeft(newPlayers, newPot);
       return;
    }

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

  const handleOnePlayerLeft = (players: Player[], pot: number) => {
    const winner = players.find(p => !p.isFolded)!;
    const newPlayers = players.map(p => {
      if (p.id === winner.id) {
        return { ...p, chips: p.chips + pot, lastAction: 'Winner (All others folded)' };
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
        } else if (bot.chips > 0) {
          handleAction('call'); // Will be an All-In call
        } else {
          handleAction('fold');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const startNextRound = () => {
    if (!gameState) return;
    
    // Filter out bankrupt players (chips <= 0)
    const nextPlayers = gameState.players
      .filter(p => p.chips > 0)
      .map(p => ({
        ...p,
        cards: [],
        bet: 0,
        isFolded: false,
        isAllIn: false,
        lastAction: undefined
      }));

    if (nextPlayers.length < 2) {
      alert("Permainan selesai! Tidak cukup pemain yang memiliki chip.");
      setGameState(null);
      return;
    }

    const deck = shuffleDeck(createDeck());
    const dealerIndex = (gameState.dealerIndex + 1) % nextPlayers.length;
    
    const sbIndex = (dealerIndex + 1) % nextPlayers.length;
    const bbIndex = (dealerIndex + 2) % nextPlayers.length;
    
    setGameState({
      players: nextPlayers,
      communityCards: [],
      pot: 0,
      phase: 'betting',
      dealerIndex,
      currentPlayerIndex: (dealerIndex + 3) % nextPlayers.length,
      deck,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      currentBet: BIG_BLIND,
    });

    dealInitialCards(nextPlayers, deck, sbIndex, bbIndex);
  };

  return { gameState, startNewGame, startNextRound, handleAction };
}
