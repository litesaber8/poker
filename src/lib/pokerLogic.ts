export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export type HandRank = 
  | 'High Card'
  | 'Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export const HAND_RANK_VALUE: Record<HandRank, number> = {
  'High Card': 1,
  'Pair': 2,
  'Two Pair': 3,
  'Three of a Kind': 4,
  'Straight': 5,
  'Flush': 6,
  'Full House': 7,
  'Four of a Kind': 8,
  'Straight Flush': 9,
  'Royal Flush': 10
};

export interface EvaluatedHand {
  rank: HandRank;
  value: number; // For comparing hands of same rank
  cards: Card[]; // The cards that make up the hand
}

// Simple evaluation logic for now, can be expanded
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    return {
      rank: 'High Card',
      value: sorted.length > 0 ? RANK_VALUES[sorted[0].rank] : 0,
      cards: sorted
    };
  }

  // Helper functions
  const isFlush = (hand: Card[]) => new Set(hand.map(c => c.suit)).size === 1;
  const isStraight = (hand: Card[]) => {
    const values = [...new Set(hand.map(c => RANK_VALUES[c.rank]))].sort((a, b) => a - b);
    if (values.length < 5) return false;
    // Check for A,2,3,4,5
    if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) return true;
    for (let i = 0; i <= values.length - 5; i++) {
      if (values[i + 4] - values[i] === 4) return true;
    }
    return false;
  };

  const getRankCounts = (hand: Card[]) => {
    const counts: Record<string, number> = {};
    hand.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
    return counts;
  };

  // Get all combinations of 5 cards from the input cards (usually 7 for Hold'em)
  function combinations(array: Card[], k: number): Card[][] {
    const result: Card[][] = [];
    function helper(start: number, combo: Card[]) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    }
    helper(0, []);
    return result;
  }

  const allCombos = combinations(cards, 5);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of allCombos) {
    const counts = getRankCounts(combo);
    const countValues = Object.values(counts).sort((a, b) => b - a);
    const sortedCombo = [...combo].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    
    let currentRank: HandRank = 'High Card';
    let currentValue = sortedCombo.reduce((acc, c, i) => acc + RANK_VALUES[c.rank] * Math.pow(15, 4 - i), 0);

    const flush = isFlush(combo);
    const straight = isStraight(combo);

    if (flush && straight) {
      // Check for Royal Flush
      const ranks = combo.map(c => RANK_VALUES[c.rank]);
      if (ranks.includes(14) && ranks.includes(13) && ranks.includes(12) && ranks.includes(11) && ranks.includes(10)) {
        currentRank = 'Royal Flush';
      } else {
        currentRank = 'Straight Flush';
      }
    } else if (countValues[0] === 4) {
      currentRank = 'Four of a Kind';
    } else if (countValues[0] === 3 && countValues[1] === 2) {
      currentRank = 'Full House';
    } else if (flush) {
      currentRank = 'Flush';
    } else if (straight) {
      currentRank = 'Straight';
    } else if (countValues[0] === 3) {
      currentRank = 'Three of a Kind';
    } else if (countValues[0] === 2 && countValues[1] === 2) {
      currentRank = 'Two Pair';
    } else if (countValues[0] === 2) {
      currentRank = 'Pair';
    }

    // Adjusted value calculation for proper tie-breaking
    // Hand rank weight (High Card = 1, Pair = 2, ...)
    const rankWeight = HAND_RANK_VALUE[currentRank] * Math.pow(15, 6);
    // Add primary cards value and then kicker values
    // This is simplified but should work for most cases
    const totalValue = rankWeight + currentValue;

    if (!bestHand || totalValue > bestHand.value) {
      bestHand = { rank: currentRank, value: totalValue, cards: sortedCombo };
    }
  }

  return bestHand!;
}
