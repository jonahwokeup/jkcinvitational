"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gamepad2, RefreshCw } from 'lucide-react';

interface WhomstPageProps {
  params: Promise<{ id: string }>;
}

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: number; // 1-13 (Ace=1, Jack=11, Queen=12, King=13)
  displayValue: string; // 'A', '2', '3', ..., '10', 'J', 'Q', 'K'
}

interface GameState {
  deck: Card[];
  grid: (Card | null)[];
  faceDown: boolean[];
  currentCard: Card | null; // This is now only used for internal logic, not displayed
  score: number;
  gameStatus: 'playing' | 'won' | 'lost';
  selectedCardIndex: number | null;
  showPrediction: boolean;
  dealtCard: Card | null; // Card that's been dealt and is moving to position
  isAnimating: boolean; // Whether a card is currently animating
  showReviveButton: boolean; // Whether to show the revive pile button
  revivalMode: boolean; // Whether user is selecting a pile to revive
  lastDealtCard: Card | null; // Store the last dealt card for revival
  eliminatedCards: (Card | null)[]; // Store the cards that caused each pile to be eliminated
  usedRevivalValues: Set<number>; // Track which card values have been used for revival
  showGameOverGif: boolean; // Whether to show the game over GIF animation
  // Exacto system
  showExactoButton: boolean; // Whether to show the "Use Exacto" button
  exactoMode: boolean; // Whether user is in Exacto prediction mode
  exactoPrediction: { fixtureId: string; homeScore: number; awayScore: number } | null; // User's Exacto prediction
  usedExacto: boolean; // Whether user has already used their Exacto opportunity
  exactoSuccess: boolean; // Whether user's Exacto was successful
}

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const VALUES = [
  { value: 2, display: '2' },
  { value: 3, display: '3' },
  { value: 4, display: '4' },
  { value: 5, display: '5' },
  { value: 6, display: '6' },
  { value: 7, display: '7' },
  { value: 8, display: '8' },
  { value: 9, display: '9' },
  { value: 10, display: '10' },
  { value: 11, display: 'J' },
  { value: 12, display: 'Q' },
  { value: 13, display: 'K' },
  { value: 14, display: 'A' }, // Ace is now 14
];

function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    VALUES.forEach(({ value, display }) => {
      deck.push({ suit, value, displayValue: display });
    });
  });
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getSuitSymbol(suit: string): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
}

function getSuitColor(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';
}

// Helper function to check if only one pile remains open
function hasOnlyOneOpenPile(faceDown: boolean[]): boolean {
  return faceDown.filter(down => !down).length === 1;
}

// Helper function to check if there are 4 cards of the same value that haven't been used for revival
function hasFourOfAKind(grid: (Card | null)[], faceDown: boolean[], usedRevivalValues: Set<number>): boolean {
  const valueCounts: { [key: number]: number } = {};
  
  grid.forEach((card, index) => {
    if (card && !faceDown[index]) {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    }
  });
  
  // Check if any value has 4+ cards AND hasn't been used for revival
  return Object.entries(valueCounts).some(([value, count]) => 
    count >= 4 && !usedRevivalValues.has(parseInt(value))
  );
}

// Helper function to get the card value that triggered the revival
function getRevivalValue(grid: (Card | null)[], faceDown: boolean[]): number | null {
  const valueCounts: { [key: number]: number } = {};
  
  grid.forEach((card, index) => {
    if (card && !faceDown[index]) {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    }
  });
  
  // Find the first value that has 4+ cards
  for (const [value, count] of Object.entries(valueCounts)) {
    if (count >= 4) {
      return parseInt(value);
    }
  }
  
  return null;
}

export default function WhomstPage({ params }: WhomstPageProps) {
  const [competitionId, setCompetitionId] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    grid: Array(9).fill(null),
    faceDown: Array(9).fill(false),
    currentCard: null,
    score: 0,
    gameStatus: 'playing',
    selectedCardIndex: null,
    showPrediction: false,
    dealtCard: null,
    isAnimating: false,
    showReviveButton: false,
    revivalMode: false,
    lastDealtCard: null,
    eliminatedCards: Array(9).fill(null),
    usedRevivalValues: new Set(),
    showGameOverGif: false,
    // Exacto system
    showExactoButton: false,
    exactoMode: false,
    exactoPrediction: null,
    usedExacto: false,
    exactoSuccess: false,
  });

  useEffect(() => {
    params.then(({ id }) => setCompetitionId(id));
  }, [params]);

  const initializeGame = () => {
    const deck = shuffleDeck(createDeck());
    const initialGrid = deck.slice(0, 9);
    const remainingDeck = deck.slice(9);

    setGameState({
      deck: remainingDeck,
      grid: initialGrid,
      faceDown: Array(9).fill(false),
      currentCard: null,
      score: 0,
      gameStatus: 'playing',
      selectedCardIndex: null,
      showPrediction: false,
      dealtCard: null,
      isAnimating: false,
      showReviveButton: false,
      revivalMode: false,
      lastDealtCard: null,
      eliminatedCards: Array(9).fill(null),
      usedRevivalValues: new Set(),
      showGameOverGif: false,
      // Exacto system
      showExactoButton: false,
      exactoMode: false,
      exactoPrediction: null,
      usedExacto: false,
      exactoSuccess: false,
    });
  };

  useEffect(() => {
    if (competitionId) {
      initializeGame();
    }
  }, [competitionId]);

  const handleCardClick = (index: number) => {
    if (gameState.gameStatus !== 'playing' || gameState.faceDown[index]) {
      return;
    }

    // Just select the card and show prediction interface
    setGameState(prev => ({
      ...prev,
      selectedCardIndex: index,
      showPrediction: true,
    }));
  };

  const handlePrediction = (prediction: 'higher' | 'lower') => {
    if (gameState.selectedCardIndex === null || gameState.isAnimating) return;

    // Deal the next card after prediction is made
    const newDeck = [...gameState.deck];
    const nextCard = newDeck.shift();

    if (!nextCard) return;

    const selectedCard = gameState.grid[gameState.selectedCardIndex];
    if (!selectedCard) return;

    // Debug logging
    console.log('Prediction Debug:', {
      prediction,
      selectedCard: `${selectedCard.displayValue}${getSuitSymbol(selectedCard.suit)} (value: ${selectedCard.value})`,
      nextCard: `${nextCard.displayValue}${getSuitSymbol(nextCard.suit)} (value: ${nextCard.value})`,
      selectedValue: selectedCard.value,
      nextValue: nextCard.value,
    });

    let isCorrect = false;
    if (prediction === 'higher') {
      isCorrect = nextCard.value > selectedCard.value;
      console.log(`Higher check: ${nextCard.value} > ${selectedCard.value} = ${isCorrect}`);
    } else {
      isCorrect = nextCard.value < selectedCard.value;
      console.log(`Lower check: ${nextCard.value} < ${selectedCard.value} = ${isCorrect}`);
    }

    console.log('Final result:', isCorrect ? 'CORRECT' : 'INCORRECT');

    // Start animation - show dealt card on the side
    setGameState(prev => ({
      ...prev,
      dealtCard: nextCard,
      isAnimating: true,
      showPrediction: false,
      lastDealtCard: nextCard, // Store for potential revival
    }));

    // After card appears on side, move it to the target position
    setTimeout(() => {
      if (isCorrect) {
        // Correct prediction - replace the card
        const newGrid = [...gameState.grid];
        if (gameState.selectedCardIndex !== null) {
          newGrid[gameState.selectedCardIndex] = nextCard;
        }

                  setGameState(prev => ({
            ...prev,
            deck: newDeck,
            grid: newGrid,
            score: prev.score + 1,
            selectedCardIndex: null,
            dealtCard: null,
            isAnimating: false,
            showReviveButton: hasFourOfAKind(newGrid, prev.faceDown, prev.usedRevivalValues),
          }));
      } else {
        // Check if this should allow continuation due to same value and only one pile
        const onlyOnePile = hasOnlyOneOpenPile(gameState.faceDown);
        const sameValue = selectedCard.value === nextCard.value;
        
        if (onlyOnePile && sameValue) {
          // Special case: same value with only one pile - allow continuation
          const newGrid = [...gameState.grid];
          if (gameState.selectedCardIndex !== null) {
            newGrid[gameState.selectedCardIndex] = nextCard;
          }

          setGameState(prev => ({
            ...prev,
            deck: newDeck,
            grid: newGrid,
            score: prev.score + 1,
            selectedCardIndex: null,
            dealtCard: null,
            isAnimating: false,
            showReviveButton: hasFourOfAKind(newGrid, prev.faceDown, prev.usedRevivalValues),
          }));
        } else {
          // Incorrect prediction - turn card face down
          const newFaceDown = [...gameState.faceDown];
          const newEliminatedCards = [...gameState.eliminatedCards];
          
          if (gameState.selectedCardIndex !== null) {
            newFaceDown[gameState.selectedCardIndex] = true;
            newEliminatedCards[gameState.selectedCardIndex] = nextCard; // Store the card that caused elimination
          }

          setGameState(prev => ({
            ...prev,
            deck: newDeck,
            faceDown: newFaceDown,
            eliminatedCards: newEliminatedCards,
            selectedCardIndex: null,
            dealtCard: null,
            isAnimating: false,
            showReviveButton: hasFourOfAKind(prev.grid, newFaceDown, prev.usedRevivalValues),
          }));
        }
      }

      // Check win/lose conditions
      setTimeout(() => {
        setGameState(prev => {
          const faceUpCount = prev.faceDown.filter(down => !down).length;
          const isWon = prev.deck.length === 0;
          const isLost = faceUpCount === 0;

          return {
            ...prev,
            gameStatus: isWon ? 'won' : isLost ? 'lost' : 'playing',
            showGameOverGif: isLost, // Show GIF only when game is lost
          };
        });
      }, 300);
    }, 800); // Time for card to move from side to position
  };

  // dealNextCard is no longer called directly by a button, but internally by handlePrediction
  const dealNextCard = () => {
    if (gameState.deck.length === 0 || gameState.gameStatus !== 'playing') return;

    const newDeck = [...gameState.deck];
    const nextCard = newDeck.shift();

    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      currentCard: nextCard || null,
    }));
  };

  // Handle pile revival
  const handleRevivePile = () => {
    setGameState(prev => ({
      ...prev,
      revivalMode: true,
      showReviveButton: false, // Hide button when entering revival mode
    }));
  };

  // Handle selecting a pile to revive
  const handlePileRevival = (index: number) => {
    if (gameState.faceDown[index] === false) return;

    const eliminatedCard = gameState.eliminatedCards[index];
    if (!eliminatedCard) return; // Safety check

    // Find which card value was used for this revival
    const revivalValue = getRevivalValue(gameState.grid, gameState.faceDown);
    if (revivalValue === null) return; // Safety check

    const newFaceDown = [...gameState.faceDown];
    newFaceDown[index] = false; // Revive the pile

    const newGrid = [...gameState.grid];
    newGrid[index] = eliminatedCard; // Put the eliminated card back in the revived pile

    const newUsedRevivalValues = new Set(gameState.usedRevivalValues);
    newUsedRevivalValues.add(revivalValue); // Mark this value as used for revival

    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      faceDown: newFaceDown,
      revivalMode: false,
      showReviveButton: false, // Button stays hidden after revival is used
      usedRevivalValues: newUsedRevivalValues,
    }));
  };

  // Handle Exacto button click
  const handleExactoClick = () => {
    setGameState(prev => ({
      ...prev,
      exactoMode: true,
      showExactoButton: false,
    }));
  };

  // Handle Exacto prediction submission
  const handleExactoPrediction = (fixtureId: string, homeScore: number, awayScore: number) => {
    setGameState(prev => ({
      ...prev,
      exactoPrediction: { fixtureId, homeScore, awayScore },
      exactoMode: false,
      usedExacto: true,
    }));
  };

  const CardComponent = ({ card, index, isFaceDown }: { card: Card | null; index: number; isFaceDown: boolean }) => {
    if (!card) return null;

    if (isFaceDown) {
      // In revival mode, face-down piles can be clicked to revive
      if (gameState.revivalMode) {
        return (
          <button
            onClick={() => handlePileRevival(index)}
            className="w-20 h-28 bg-gray-800 rounded-lg border-2 border-blue-400 flex items-center justify-center transform transition-all duration-300 ease-in-out hover:bg-gray-700 hover:border-blue-300"
          >
            <div className="text-blue-300 text-sm">🔄</div>
          </button>
        );
      }
      
      return (
        <div className="w-20 h-28 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center transform transition-all duration-300 ease-in-out">
          <div className="text-white text-sm">❌</div>
        </div>
      );
    }

    const isSelected = gameState.selectedCardIndex === index;
    const isNewlyDealt = gameState.grid[index] === card && gameState.score > 0; // Check if this card was just dealt

    return (
      <div className="relative">
        <button
          onClick={() => handleCardClick(index)}
          className={`w-20 h-28 bg-white rounded-lg border-2 ${
            isSelected ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-300'
          } flex flex-col items-center justify-center hover:shadow-md transition-all duration-300 ease-in-out transform ${
            isNewlyDealt ? 'animate-card-deal' : ''
          }`}
          disabled={gameState.gameStatus !== 'playing'}
          style={{
            transform: isNewlyDealt ? 'translateY(-10px) scale(1.05)' : 'translateY(0) scale(1)',
            boxShadow: isNewlyDealt ? '0 10px 25px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: isNewlyDealt ? 10 : 1,
          }}
        >
          <div className={`text-base font-bold ${getSuitColor(card.suit)}`}>
            {card.displayValue}
          </div>
          <div className={`text-xl ${getSuitColor(card.suit)}`}>
            {getSuitSymbol(card.suit)}
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        @keyframes cardDeal {
          0% {
            transform: translateY(-50px) scale(0.8);
            opacity: 0;
            box-shadow: 0 0 0 rgba(0,0,0,0);
          }
          50% {
            transform: translateY(-25px) scale(1.1);
            opacity: 0.8;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        }

        @keyframes cardFlip {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(90deg);
          }
          100% {
            transform: rotateY(180deg);
          }
        }

        .animate-card-deal {
          animation: cardDeal 0.6s ease-out forwards;
        }

        .dealt-card {
          position: fixed;
          top: 50%;
          right: 10%;
          transform: translateY(-50%);
          z-index: 1000;
          animation: cardSlideIn 0.5s ease-out forwards;
        }

        .dealt-card.moving {
          animation: cardMoveToPosition 0.8s ease-in-out forwards;
        }

        @keyframes cardSlideIn {
          0% {
            opacity: 0;
            transform: translateY(-50%) translateX(100px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(-50%) translateX(0) scale(1);
          }
        }

        @keyframes cardMoveToPosition {
          0% {
            opacity: 1;
            transform: translateY(-50%) translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-50%) translateX(-200px) scale(0.8);
          }
        }
      `}</style>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Whomst</h1>
              <p className="text-gray-600">A strategic card game</p>
            </div>
            <Link
              href={`/competition/${competitionId}/minigames`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Minigames</span>
            </Link>
          </div>
        </div>

        {/* Game Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{gameState.score}</div>
              <div className="text-sm text-gray-600">Cards Won</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{gameState.deck.length}</div>
              <div className="text-sm text-gray-600">Cards Left</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {gameState.faceDown.filter(down => !down).length}
              </div>
              <div className="text-sm text-gray-600">Face Up</div>
            </div>
            <button
              onClick={initializeGame}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>New Game</span>
            </button>
          </div>
        </div>

        {/* Game Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Prediction Interface */}
          {gameState.showPrediction && (
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Will the next card be higher or lower than your selected card?
              </h3>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => handlePrediction('higher')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={gameState.isAnimating}
                >
                  Higher
                </button>
                <button
                  onClick={() => handlePrediction('lower')}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={gameState.isAnimating}
                >
                  Lower
                </button>
              </div>
            </div>
          )}

          {/* Card Grid */}
          <div className="grid grid-cols-3 gap-1 mb-6" style={{ maxWidth: 'fit-content', margin: '0 auto' }}>
            {gameState.grid.map((card, index) => (
              <CardComponent
                key={index}
                card={card}
                index={index}
                isFaceDown={gameState.faceDown[index]}
              />
            ))}
          </div>

          {/* Game Over GIF Overlay */}
          {gameState.showGameOverGif && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
                <div className="mb-4">
                  <img 
                    src="/thatsthat.GIF" 
                    alt="Game Over" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">💀 Game Over 💀</h3>
                <p className="text-gray-600 mb-4">All cards are face down. Better luck next time!</p>
                <button
                  onClick={() => {
                    setGameState(prev => ({ ...prev, showGameOverGif: false }));
                    initializeGame();
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Dealt Card Display */}
          {gameState.dealtCard && (
            <div className={`dealt-card ${gameState.isAnimating ? 'moving' : ''}`}>
              <div className="w-20 h-28 bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center shadow-lg">
                <div className={`text-base font-bold ${getSuitColor(gameState.dealtCard.suit)}`}>
                  {gameState.dealtCard.displayValue}
                </div>
                <div className={`text-xl ${getSuitColor(gameState.dealtCard.suit)}`}>
                  {getSuitSymbol(gameState.dealtCard.suit)}
                </div>
              </div>
            </div>
          )}

          {/* Game Controls */}
          {gameState.gameStatus === 'playing' && !gameState.showPrediction && !gameState.isAnimating && !gameState.revivalMode && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Click any card to start the next round</p>
            </div>
          )}

          {gameState.isAnimating && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Dealing card...</p>
            </div>
          )}

          {/* Revival Mode Instructions */}
          {gameState.revivalMode && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Select a face-down pile to revive with the card that eliminated it</p>
            </div>
          )}

          {/* Revive Pile Button */}
          {gameState.showReviveButton && !gameState.revivalMode && !gameState.isAnimating && (
            <div className="text-center">
              <button
                onClick={handleRevivePile}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mb-4"
              >
                🎉 Revive Pile! 🎉
              </button>
              <p className="text-gray-600 text-sm">You have 4 cards of the same value! Choose a face-down pile to revive.</p>
            </div>
          )}

          {/* Exacto Button */}
          {gameState.showExactoButton && !gameState.exactoMode && !gameState.isAnimating && (
            <div className="text-center">
              <button
                onClick={handleExactoClick}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mb-4"
              >
                🎯 Use Exacto! 🎯
              </button>
              <p className="text-gray-600 text-sm">Predict the exact score of a match to revive yourself!</p>
            </div>
          )}

          {/* Exacto Mode Instructions */}
          {gameState.exactoMode && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Select a match and predict the exact score to revive yourself</p>
              <p className="text-gray-500 text-sm mb-4">You cannot predict matches involving teams you previously picked</p>
            </div>
          )}

          {/* Game Over */}
          {gameState.gameStatus !== 'playing' && !gameState.showGameOverGif && (
            <div className="text-center">
              <div className={`text-3xl font-bold mb-4 ${
                gameState.gameStatus === 'won' ? 'text-green-600' : 'text-red-600'
              }`}>
                {gameState.gameStatus === 'won' ? '🎉 You Won! 🎉' : '💀 Game Over 💀'}
              </div>
              <p className="text-gray-600 mb-4">
                {gameState.gameStatus === 'won'
                  ? `Congratulations! You got through ${gameState.score} cards!`
                  : 'All cards are face down. Better luck next time!'
                }
              </p>
              <button
                onClick={initializeGame}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Game Rules */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Play</h3>
          <div className="text-blue-800 space-y-2">
            <p>• Click on any face-up card in the 3x3 grid</p>
            <p>• Predict if the next card will be higher or lower than your chosen card</p>
            <p>• If correct: the new card replaces your chosen card</p>
            <p>• If incorrect: your chosen card turns face down</p>
            <p>• Win by getting through the entire deck, lose if all cards are face down</p>
            <p className="font-semibold mt-3">Special Rules:</p>
            <p>• <strong>Same Value Continuation:</strong> If only 1 pile remains and the dealt card has the same value, you can continue playing</p>
            <p>• <strong>Four of a Kind Revival:</strong> Get 4 cards of the same value to revive a face-down pile with the card that eliminated it</p>
            <p>• <strong>One Revival Per Value:</strong> Each set of 4 cards of the same value can only be used for revival once</p>
            <p>• <strong>Exacto Revival:</strong> Eliminated players can predict exact scores to revive themselves (one chance only)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
