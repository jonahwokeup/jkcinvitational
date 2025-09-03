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

export default function WhomstTiebreak({ competitionId, onComplete }: WhomstTiebreakProps) {
  const [deck, setDeck] = useState<Card[]>([])
  const [grid, setGrid] = useState<(Card | null)[]>(new Array(9).fill(null))
  const [nextCard, setNextCard] = useState<Card | null>(null)
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing')
  const [score, setScore] = useState(0)
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [isDealing, setIsDealing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    setDeck(newDeck)
    
    // Deal initial 9 cards
    const initialGrid = newDeck.slice(0, 9).map(card => card)
    setGrid(initialGrid)
    setNextCard(newDeck[9] || null)
    setScore(0)
    setGameState('playing')
  }

  const dealCard = () => {
    if (deck.length <= 9) {
      setGameState('won')
      return
    }

    const newDeck = deck.slice(1)
    setDeck(newDeck)
    setNextCard(newDeck[8] || null)
  }

  const handleCardClick = (index: number) => {
    if (gameState !== 'playing' || !nextCard || selectedCard !== null) return
    
    setSelectedCard(index)
  }

  const handleHigherLower = (isHigher: boolean) => {
    if (selectedCard === null || !nextCard) return

    const currentCard = grid[selectedCard]
    if (!currentCard) return

    const isCorrect = isHigher 
      ? nextCard.value > currentCard.value
      : nextCard.value < currentCard.value

    if (isCorrect) {
      // Replace the card
      const newGrid = [...grid]
      newGrid[selectedCard] = nextCard
      setGrid(newGrid)
      setScore(score + 1)
      dealCard()
    } else {
      // Turn card face down
      const newGrid = [...grid]
      newGrid[selectedCard] = null
      setGrid(newGrid)
      
      // Check if game is lost
      const remainingCards = newGrid.filter(card => card !== null)
      if (remainingCards.length === 0) {
        setGameState('lost')
        return
      }
      
      dealCard()
    }

    setSelectedCard(null)
  }

  const submitScore = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/competition/${competitionId}/tiebreak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      })

      if (response.ok) {
        onComplete(score)
      } else {
        const error = await response.json()
        alert(`Error submitting score: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting score:', error)
      alert('Failed to submit score')
    } finally {
      setIsSubmitting(false)
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

  if (gameState === 'won') {
    return (
      <div className="text-center p-8">
        <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 You Won!</h2>
        <p className="text-xl mb-4">Cards dealt: {score + 9}</p>
        <button
          onClick={submitScore}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </div>
    )
  }

  if (gameState === 'lost') {
    return (
      <div className="text-center p-8">
        <h2 className="text-3xl font-bold text-red-600 mb-4">💀 Game Over</h2>
        <p className="text-xl mb-4">Cards dealt: {score}</p>
        <button
          onClick={submitScore}
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Whomst Tiebreak</h2>
        <p className="text-gray-600">Score: {score} cards dealt</p>
        <p className="text-sm text-gray-500">Cards remaining: {deck.length - 9}</p>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {grid.map((card, index) => (
          <div
            key={index}
            className={`aspect-[3/4] border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
              card
                ? 'bg-white border-gray-300 hover:border-blue-500'
                : 'bg-gray-200 border-gray-400'
            } ${
              selectedCard === index ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleCardClick(index)}
          >
            {card ? (
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
      {nextCard && (
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Next Card:</h3>
          <div className="inline-block border-2 border-gray-300 rounded-lg p-4 bg-white">
            {getCardDisplay(nextCard)}
          </div>
        </div>
      )}

      {/* Higher/Lower Buttons */}
      {selectedCard !== null && nextCard && (
        <div className="text-center">
          <p className="text-lg mb-4">
            Will the next card be higher or lower than {getCardDisplay(grid[selectedCard]!)}
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

      {/* Instructions */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Click a card to select it, then choose if the next card will be higher or lower.</p>
        <p>If correct, the new card replaces the selected one. If wrong, the selected card is turned face down.</p>
        <p>Win by dealing through the entire deck, or lose if all cards are face down.</p>
      </div>
    </div>
  )
}
