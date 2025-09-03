'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface WhomstTiebreakProps {
  competitionId: string
  onComplete: (score: number) => void
}

interface Card {
  suit: string
  value: number
  displayValue: string
}

interface GameState {
  deck: Card[]
  grid: (Card | null)[]
  faceDown: boolean[]
  nextCard: Card | null
  score: number
  gameStatus: 'playing' | 'won' | 'lost'
  selectedCard: number | null
  isDealing: boolean
  isSubmitting: boolean
  showReviveButton: boolean
  reviveUsed: Set<number>
  showReviveSelection: boolean
}

const SUITS = ['♠', '♥', '♦', '♣']
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
  { value: 14, display: 'A' }
]

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

export default function WhomstTiebreak({ competitionId, onComplete }: WhomstTiebreakProps) {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    grid: new Array(9).fill(null),
    faceDown: new Array(9).fill(false),
    nextCard: null,
    score: 0,
    gameStatus: 'playing',
    selectedCard: null,
    isDealing: false,
    isSubmitting: false,
    showReviveButton: false,
    reviveUsed: new Set(),
    showReviveSelection: false,
  })

  // Initialize deck and deal initial cards
  useEffect(() => {
    initializeGame()
  }, [])

  const initializeGame = () => {
    // Create and shuffle deck
    const newDeck: Card[] = []
    for (const suit of SUITS) {
      for (const value of VALUES) {
        newDeck.push({
          suit,
          value: value.value,
          displayValue: value.display
        })
      }
    }
    
    // Shuffle deck
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
    }

    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      grid: newDeck.slice(0, 9).map(card => card),
      faceDown: new Array(9).fill(false),
      nextCard: newDeck[9] || null,
      score: 0,
      gameStatus: 'playing',
      selectedCard: null,
      isDealing: false,
      showReviveButton: false,
      reviveUsed: new Set(),
      showReviveSelection: false,
    }))
  }

  const dealCard = () => {
    if (gameState.deck.length <= 9) {
      setGameState(prev => ({ ...prev, gameStatus: 'won' }))
      return
    }

    const newDeck = gameState.deck.slice(1)
    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      nextCard: newDeck[8] || null
    }))
  }

  const handleCardClick = (index: number) => {
    if (gameState.gameStatus !== 'playing') return
    
    // If in revive selection mode, handle pile revival
    if (gameState.showReviveSelection) {
      if (gameState.faceDown[index]) {
        handlePileSelection(index)
      }
      return
    }
    
    // Normal game mode - only allow clicking face-up cards
    if (gameState.faceDown[index] || !gameState.nextCard || gameState.selectedCard !== null) {
      return
    }
    
    setGameState(prev => ({ ...prev, selectedCard: index }))
  }

  const handleHigherLower = (isHigher: boolean) => {
    if (gameState.selectedCard === null || !gameState.nextCard) return

    const currentCard = gameState.grid[gameState.selectedCard]
    if (!currentCard) return

    const isCorrect = isHigher 
      ? gameState.nextCard.value > currentCard.value
      : gameState.nextCard.value < currentCard.value

    // Check for same value continuation (only if prediction was wrong)
    const faceUpCount = gameState.faceDown.filter(down => !down).length
    const isSameValue = currentCard.value === gameState.nextCard.value
    const canContinue = !isCorrect && isSameValue && faceUpCount === 1

    if (isCorrect || canContinue) {
      // Correct prediction OR same value continuation - replace the card
      const newGrid = [...gameState.grid]
      newGrid[gameState.selectedCard] = gameState.nextCard

      setGameState(prev => {
        const newState = {
          ...prev,
          grid: newGrid,
          score: prev.score + 1,
          selectedCard: null,
          showReviveButton: false, // Reset revive button
        }

        // Check for four-of-a-kind after card replacement
        const fourOfAKindValue = checkForFourOfAKind(newState.grid, newState.faceDown)
        if (fourOfAKindValue && !newState.reviveUsed.has(fourOfAKindValue)) {
          newState.showReviveButton = true
        }

        return newState
      })

      dealCard()
    } else {
      // Incorrect prediction - turn card face down
      const newGrid = [...gameState.grid]
      const newFaceDown = [...gameState.faceDown]
      newFaceDown[gameState.selectedCard] = true

      setGameState(prev => {
        const newState = {
          ...prev,
          grid: newGrid,
          faceDown: newFaceDown,
          selectedCard: null,
          showReviveButton: false, // Reset revive button
        }

        // Check for four-of-a-kind after card goes face down
        const fourOfAKindValue = checkForFourOfAKind(newState.grid, newState.faceDown)
        if (fourOfAKindValue && !newState.reviveUsed.has(fourOfAKindValue)) {
          newState.showReviveButton = true
        }

        return newState
      })

      // Check if game is lost
      setTimeout(() => {
        setGameState(prev => {
          const faceUpCount = prev.faceDown.filter(down => !down).length
          if (faceUpCount === 0) {
            return { ...prev, gameStatus: 'lost' }
          }
          return prev
        })
      }, 300)

      dealCard()
    }
  }

  // Handle revive pile button click
  const handleRevivePile = () => {
    setGameState(prev => ({
      ...prev,
      showReviveSelection: true,
      showReviveButton: false,
    }))
  }

  // Handle pile selection for revival
  const handlePileSelection = (pileIndex: number) => {
    const faceDownPiles = getFaceDownPiles(gameState.faceDown)
    if (!faceDownPiles.includes(pileIndex)) return

    // Get the four-of-a-kind value
    const fourOfAKindValue = checkForFourOfAKind(gameState.grid, gameState.faceDown)
    if (!fourOfAKindValue) return

    // Revive the selected pile with the next card from deck
    const newDeck = [...gameState.deck]
    const reviveCard = newDeck.shift()
    
    if (!reviveCard) return

    const newGrid = [...gameState.grid]
    const newFaceDown = [...gameState.faceDown]
    
    // Revive the pile
    newGrid[pileIndex] = reviveCard
    newFaceDown[pileIndex] = false

    setGameState(prev => {
      const newReviveUsed = new Set(prev.reviveUsed)
      newReviveUsed.add(fourOfAKindValue)

      return {
        ...prev,
        deck: newDeck,
        grid: newGrid,
        faceDown: newFaceDown,
        showReviveSelection: false,
        reviveUsed: newReviveUsed,
        score: prev.score + 1,
      }
    })
  }

  // Cancel revive pile selection
  const cancelReviveSelection = () => {
    setGameState(prev => ({
      ...prev,
      showReviveSelection: false,
      showReviveButton: true, // Show button again
    }))
  }

  const submitScore = async () => {
    setGameState(prev => ({ ...prev, isSubmitting: true }))
    try {
      const response = await fetch(`/api/competition/${competitionId}/tiebreak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score: gameState.score }),
      })

      if (response.ok) {
        onComplete(gameState.score)
      } else {
        const error = await response.json()
        alert(`Error submitting score: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting score:', error)
      alert('Failed to submit score')
    } finally {
      setGameState(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const getCardColor = (suit: string) => {
    return suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-black'
  }

  const getCardDisplay = (card: Card | null) => {
    if (!card) return null
    return (
      <div className={`text-2xl font-bold ${getCardColor(card.suit)}`}>
        {card.displayValue}
        <br />
        {card.suit}
      </div>
    )
  }

  if (gameState.gameStatus === 'won') {
    return (
      <div className="text-center p-8">
        <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 You Won!</h2>
        <p className="text-xl mb-4">Cards dealt: {gameState.score + 9}</p>
        <button
          onClick={submitScore}
          disabled={gameState.isSubmitting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {gameState.isSubmitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </div>
    )
  }

  if (gameState.gameStatus === 'lost') {
    return (
      <div className="text-center p-8">
        <h2 className="text-3xl font-bold text-red-600 mb-4">💀 Game Over</h2>
        <p className="text-xl mb-4">Cards dealt: {gameState.score}</p>
        <button
          onClick={submitScore}
          disabled={gameState.isSubmitting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {gameState.isSubmitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Whomst Tiebreak</h2>
        <p className="text-gray-600">Score: {gameState.score} cards dealt</p>
        <p className="text-sm text-gray-500">Cards remaining: {gameState.deck.length - 9}</p>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {gameState.grid.map((card: Card | null, index: number) => (
          <div
            key={index}
            className={`aspect-[3/4] border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
              card && !gameState.faceDown[index]
                ? 'bg-white border-gray-300 hover:border-blue-500'
                : 'bg-gray-200 border-gray-400'
            } ${
              gameState.selectedCard === index ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleCardClick(index)}
          >
            {card && !gameState.faceDown[index] ? (
              <div className="text-center">
                {getCardDisplay(card)}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Face Down</div>
            )}
          </div>
        ))}
      </div>

      {/* Next Card */}
      {gameState.nextCard && (
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Next Card:</h3>
          <div className="inline-block border-2 border-gray-300 rounded-lg p-4 bg-white">
            {getCardDisplay(gameState.nextCard)}
          </div>
        </div>
      )}

      {/* Higher/Lower Buttons */}
      {gameState.selectedCard !== null && gameState.nextCard && (
        <div className="text-center">
          <p className="text-lg mb-4">
            Will the next card be higher or lower than {getCardDisplay(gameState.grid[gameState.selectedCard]!)}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => handleHigherLower(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              Higher
            </button>
            <button
              onClick={() => handleHigherLower(false)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              Lower
            </button>
          </div>
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

      {/* Instructions */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Click a card to select it, then choose if the next card will be higher or lower.</p>
        <p>If correct, the new card replaces the selected one. If wrong, the selected card is turned face down.</p>
        <p><strong>Same Value Continuation:</strong> If only one pile remains and you get the same value, you can continue!</p>
        <p><strong>Four of a Kind Revival:</strong> Get 4 cards of the same value face-up to revive a face-down pile</p>
        <p>Each set of 4 cards can only be used for revival once</p>
        <p>Win by dealing through the entire deck, or lose if all cards are face down.</p>
        <p><strong>Ace is the highest card (value 14)</strong></p>
      </div>
    </div>
  )
}
