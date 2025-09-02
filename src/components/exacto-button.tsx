"use client";

import { useState, useEffect } from 'react';
import { X, Target, Clock } from 'lucide-react';

interface ExactoButtonProps {
  userId: string;
  currentUserId: string;
  gameweekNumber: number;
  competitionId: string;
}

interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
}

interface ExactoData {
  gameweek: {
    id: string;
    number: number;
    lockTime: string;
  };
  fixtures: Fixture[];
  previouslyPickedTeams: string[];
  existingPrediction?: {
    fixtureId: string;
    homeScore: number;
    awayScore: number;
    allFixtures?: Fixture[];
  } | null;
}

export default function ExactoButton({ userId, currentUserId, gameweekNumber, competitionId }: ExactoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exactoData, setExactoData] = useState<ExactoData | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<string>('');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Only show the button for the current user
  if (userId !== currentUserId) {
    return null;
  }

  const handleExactoClick = async () => {
    setIsLoading(true);
    setShowModal(true);
    
                try {
              const response = await fetch(`/api/competition/${competitionId}/exacto`);
              if (response.ok) {
                const data = await response.json();
                setExactoData(data);
                
                // Pre-populate form if there's an existing prediction
                if (data.existingPrediction) {
                  setSelectedFixture(data.existingPrediction.fixtureId);
                  setHomeScore(data.existingPrediction.homeScore);
                  setAwayScore(data.existingPrediction.awayScore);
                }
              } else {
                alert('Failed to load fixtures for Exacto prediction');
                setShowModal(false);
              }
            } catch (error) {
      console.error('Error fetching Exacto data:', error);
      alert('Failed to load fixtures for Exacto prediction');
      setShowModal(false);
    }
    
    setIsLoading(false);
  };

  const handleSubmitPrediction = async () => {
    if (!selectedFixture || homeScore < 0 || awayScore < 0) {
      alert('Please select a fixture and enter valid scores');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/competition/${competitionId}/exacto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixtureId: selectedFixture,
          homeScore: homeScore,
          awayScore: awayScore,
        }),
      });

                    if (response.ok) {
                setShowModal(false);
                setShowSuccessAnimation(true);
                // Reset form
                setSelectedFixture('');
                setHomeScore(0);
                setAwayScore(0);
              } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit prediction');
      }
    } catch (error) {
      console.error('Error submitting prediction:', error);
      alert('Failed to submit prediction');
    }
    
    setIsSubmitting(false);
  };

  const formatKickoffTime = (kickoff: string) => {
    return new Date(kickoff).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      <div className="mt-2">
        <button
          onClick={handleExactoClick}
          disabled={isLoading}
          className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : '🎯 Use Exacto'}
        </button>
      </div>

      {/* Exacto Prediction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-2">
                          <Target className="w-6 h-6 text-orange-600" />
                          <h2 className="text-xl font-bold text-gray-900">
                            {exactoData?.existingPrediction ? 'Edit Exacto Prediction' : 'Exacto Prediction'}
                          </h2>
                        </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-orange-900 mb-2">How Exacto Works:</h3>
                <ul className="text-orange-800 text-sm space-y-1">
                  <li>• Predict the exact score of a match in Gameweek {gameweekNumber}</li>
                  <li>• You cannot predict matches involving teams you previously picked</li>
                  <li>• If correct, you'll be revived and both teams become unavailable for future picks</li>
                  <li>• If incorrect, you're permanently out for this round</li>
                  <li>• You only get one chance to use Exacto</li>
                </ul>
              </div>

                                    {exactoData ? (
                        <>
                          {/* Current Exacto Prediction */}
                          {exactoData.existingPrediction && (
                            <div className="mb-6">
                              <h3 className="font-semibold text-gray-900 mb-2">Current Exacto Prediction:</h3>
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                {(() => {
                                  const fixture = exactoData.existingPrediction?.allFixtures?.find(f => f.id === exactoData.existingPrediction?.fixtureId);
                                  return fixture ? (
                                    <div>
                                      <div className="font-medium text-orange-900">
                                        {fixture.homeTeam} vs {fixture.awayTeam}
                                      </div>
                                      <div className="text-orange-800 mt-1">
                                        Predicted Score: {exactoData.existingPrediction.homeScore} - {exactoData.existingPrediction.awayScore}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-orange-800">Previous prediction (fixture no longer available)</div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Previously Picked Teams */}
                          {exactoData.previouslyPickedTeams.length > 0 && (
                            <div className="mb-6">
                              <h3 className="font-semibold text-gray-900 mb-2">Teams You've Previously Picked:</h3>
                              <div className="flex flex-wrap gap-2">
                                {exactoData.previouslyPickedTeams.map((team, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                                  >
                                    {team}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                  {/* Available Fixtures */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Available Matches:</h3>
                    <div className="space-y-2">
                      {exactoData.fixtures.map((fixture) => (
                        <label
                          key={fixture.id}
                          className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedFixture === fixture.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="fixture"
                            value={fixture.id}
                            checked={selectedFixture === fixture.id}
                            onChange={(e) => setSelectedFixture(e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {fixture.homeTeam} vs {fixture.awayTeam}
                              </div>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatKickoffTime(fixture.kickoff)}
                              </div>
                            </div>
                            {selectedFixture === fixture.id && (
                              <div className="text-orange-600">✓</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Score Prediction */}
                  {selectedFixture && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Predict the Exact Score:</h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">
                            {exactoData.fixtures.find(f => f.id === selectedFixture)?.homeTeam}:
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={homeScore}
                            onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        </div>
                        <span className="text-gray-500">-</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={awayScore}
                            onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            :{exactoData.fixtures.find(f => f.id === selectedFixture)?.awayTeam}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                                                <button
                              onClick={handleSubmitPrediction}
                              disabled={!selectedFixture || isSubmitting}
                              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmitting ? 'Submitting...' : 'Submit Exacto'}
                            </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading fixtures...</div>
                </div>
                        )}
        </div>
      </div>
    </div>
  )}

  {/* Success Animation */}
  {showSuccessAnimation && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 text-center max-w-md">
        <div className="mb-4">
          <img 
            src="/thatsthat.GIF" 
            alt="Success Animation" 
            className="mx-auto max-w-full h-auto"
          />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-4">
          Submission successful. This is gonna hit so hard if you nail it...
        </p>
        <button
          onClick={() => setShowSuccessAnimation(false)}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )}
</>
);
}
