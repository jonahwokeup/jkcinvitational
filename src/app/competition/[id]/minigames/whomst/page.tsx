"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  currentCard: Card | null;
  score: number;
  gameStatus: 'playing' | 'won' | 'lost';
  selectedCardIndex: number | null;
  showPrediction: boolean;
  dealtCard: Card | null; // Card that's been dealt and is moving to position
  isAnimating: boolean; // Whether a card is currently animating
  showReviveButton: boolean; // Whether to show the revive pile button
  reviveUsed: Set<number>; // Track which card values have been used for revival
  showReviveSelection: boolean; // Whether to show pile selection for revival
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
  { value: 14, display: 'A' },
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

// Helper function to check for four-of-a-kind
function checkForFourOfAKind(grid: (Card | null)[], faceDown: boolean[]): number | null {
  const faceUpCards = grid.filter((card, index) => card && !faceDown[index]);
  const valueCounts = new Map<number, number>();
  
  faceUpCards.forEach(card => {
    if (card) {
      valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
    }
  });
  
  // Find the first value that appears 4 times
  for (const [value, count] of valueCounts.entries()) {
    if (count === 4) {
      return value;
    }
  }
  
  return null;
}

// Helper function to get face-down pile indices
function getFaceDownPiles(faceDown: boolean[]): number[] {
  return faceDown.map((down, index) => down ? index : -1).filter(index => index !== -1);
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
    reviveUsed: new Set(),
    showReviveSelection: false,
  });

  useEffect(() => {
    params.then(({ id }) => setCompetitionId(id));
  }, [params]);

  // Save Whomst score to database
  const saveScore = useCallback(async (score: number) => {
    if (!competitionId) return;
    
    try {
      const response = await fetch(`/api/competition/${competitionId}/whomst-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });

      if (response.ok) {
        console.log('Score saved successfully:', score);
      } else {
        console.error('Failed to save score');
      }
    } catch (error) {
      console.error('Error saving score:', error);
    }
  }, [competitionId]);

  // Save score when game ends
  useEffect(() => {
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') {
      saveScore(gameState.score);
    }
  }, [gameState.gameStatus, gameState.score, competitionId, saveScore]);

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
      reviveUsed: new Set(),
      showReviveSelection: false,
    });
  };

  useEffect(() => {
    if (competitionId) {
      initializeGame();
    }
  }, [competitionId]);

  const handleCardClick = (index: number) => {
    if (gameState.gameStatus !== 'playing') {
      return;
    }
    
    // If in revive selection mode, handle pile revival
    if (gameState.showReviveSelection) {
      if (gameState.faceDown[index]) {
        handlePileSelection(index);
      }
      return;
    }
    
    // Normal game mode - only allow clicking face-up cards
    if (gameState.faceDown[index]) {
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
    }));

    // After card appears on side, move it to the target position
    setTimeout(() => {
      if (gameState.selectedCardIndex === null) return; // Safety check
      
      // Check for same value continuation (only if prediction was wrong)
      const faceUpCount = gameState.faceDown.filter(down => !down).length;
      const isSameValue = selectedCard.value === nextCard.value;
      const canContinue = !isCorrect && isSameValue && faceUpCount === 1;
      
      if (isCorrect || canContinue) {
        // Correct prediction OR same value continuation - replace the card
        const newGrid = [...gameState.grid];
        newGrid[gameState.selectedCardIndex] = nextCard;

        setGameState(prev => {
          const newState = {
            ...prev,
            deck: newDeck,
            grid: newGrid,
            score: prev.score + 1,
            selectedCardIndex: null,
            dealtCard: null,
            isAnimating: false,
            showReviveButton: false, // Reset revive button
          };

          // Check for four-of-a-kind after card replacement
          const fourOfAKindValue = checkForFourOfAKind(newState.grid, newState.faceDown);
          if (fourOfAKindValue && !newState.reviveUsed.has(fourOfAKindValue)) {
            newState.showReviveButton = true;
          }

          return newState;
        });
      } else {
        // Incorrect prediction - turn card face down
        const newFaceDown = [...gameState.faceDown];
        newFaceDown[gameState.selectedCardIndex] = true;

        setGameState(prev => {
          const newState = {
            ...prev,
            deck: newDeck,
            faceDown: newFaceDown,
            selectedCardIndex: null,
            dealtCard: null,
            isAnimating: false,
            showReviveButton: false, // Reset revive button
          };

          // Check for four-of-a-kind after card goes face down
          const fourOfAKindValue = checkForFourOfAKind(newState.grid, newState.faceDown);
          if (fourOfAKindValue && !newState.reviveUsed.has(fourOfAKindValue)) {
            newState.showReviveButton = true;
          }

          return newState;
        });
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
          };
        });
      }, 300);
    }, 800); // Time for card to move from side to position
  };

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

  // Handle revive pile button click
  const handleRevivePile = () => {
    setGameState(prev => ({
      ...prev,
      showReviveSelection: true,
      showReviveButton: false,
    }));
  };

  // Handle pile selection for revival
  const handlePileSelection = (pileIndex: number) => {
    const faceDownPiles = getFaceDownPiles(gameState.faceDown);
    if (!faceDownPiles.includes(pileIndex)) return;

    // Get the four-of-a-kind value
    const fourOfAKindValue = checkForFourOfAKind(gameState.grid, gameState.faceDown);
    if (!fourOfAKindValue) return;

    // Revive the selected pile with the last dealt card (or a new card from deck)
    const newDeck = [...gameState.deck];
    const reviveCard = newDeck.shift();
    
    if (!reviveCard) return;

    const newGrid = [...gameState.grid];
    const newFaceDown = [...gameState.faceDown];
    
    // Revive the pile
    newGrid[pileIndex] = reviveCard;
    newFaceDown[pileIndex] = false;

    setGameState(prev => {
      const newReviveUsed = new Set(prev.reviveUsed);
      newReviveUsed.add(fourOfAKindValue);

      return {
        ...prev,
        deck: newDeck,
        grid: newGrid,
        faceDown: newFaceDown,
        showReviveSelection: false,
        reviveUsed: newReviveUsed,
        score: prev.score + 1,
      };
    });
  };

  // Cancel revive pile selection
  const cancelReviveSelection = () => {
    setGameState(prev => ({
      ...prev,
      showReviveSelection: false,
      showReviveButton: true, // Show button again
    }));
  };

  const CardComponent = ({ card, index, isFaceDown }: { card: Card | null; index: number; isFaceDown: boolean }) => {
    if (!card) return null;

    if (isFaceDown) {
      const isReviveMode = gameState.showReviveSelection;
      return (
        <button
          onClick={() => handleCardClick(index)}
          className={`w-20 h-28 rounded-lg border-2 flex items-center justify-center transform transition-all duration-300 ease-in-out ${
            isReviveMode 
              ? 'bg-yellow-200 border-yellow-500 hover:bg-yellow-300 hover:border-yellow-600 cursor-pointer' 
              : 'bg-gray-800 border-gray-600 cursor-not-allowed'
          }`}
          disabled={!isReviveMode}
        >
          <div className={`text-sm ${isReviveMode ? 'text-yellow-800' : 'text-white'}`}>
            {isReviveMode ? '🔄' : '❌'}
          </div>
        </button>
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
                      {gameState.gameStatus === 'playing' && !gameState.showPrediction && !gameState.isAnimating && (
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">Click any card to start the next round</p>
                        </div>
                      )}

                      {gameState.isAnimating && (
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">Dealing card...</p>
                        </div>
                      )}

                      {/* Revive Pile Button */}
                      {gameState.showReviveButton && gameState.gameStatus === 'playing' && (
                        <div className="text-center mb-6">
                          <div className="bg-purple-100 border border-purple-300 rounded-lg p-4 mb-4">
                            <p className="text-purple-800 font-medium mb-3">
                              🎉 Four of a Kind Detected! 🎉
                            </p>
                            <p className="text-purple-700 text-sm mb-4">
                              You can revive one face-down pile!
                            </p>
                            <button
                              onClick={handleRevivePile}
                              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                            >
                              Revive Pile
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Revive Pile Selection */}
                      {gameState.showReviveSelection && gameState.gameStatus === 'playing' && (
                        <div className="text-center mb-6">
                          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                            <p className="text-yellow-800 font-medium mb-3">
                              Click on any face-down pile to revive it:
                            </p>
                            <button
                              onClick={cancelReviveSelection}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              Cancel Revival
                            </button>
                          </div>
                        </div>
                      )}

          {/* Game Over */}
          {gameState.gameStatus !== 'playing' && (
            <div className="text-center">
              {gameState.gameStatus === 'lost' && (
                <div className="mb-4">
                  <img 
                    src="/thatsthat.GIF" 
                    alt="Game Over" 
                    className="w-32 h-32 mx-auto mb-4"
                  />
                </div>
              )}
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
            <p>• <strong>Same Value Continuation:</strong> If only one pile remains and you get the same value, you can continue!</p>
            <p>• <strong>Four of a Kind Revival:</strong> Get 4 cards of the same value face-up to revive a face-down pile</p>
            <p>• Each set of 4 cards can only be used for revival once</p>
            <p>• Win by getting through the entire deck, lose if all cards are face down</p>
            <p>• <strong>Ace is the highest card (value 14)</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
