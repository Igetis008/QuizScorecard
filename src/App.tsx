import React, { useState, useEffect } from 'react';
import { Plus, Minus, RotateCcw, Trophy, Users, Settings, Monitor, Share2 } from 'lucide-react';
import { PresentationSync } from './components/PresentationSync';
import { LiveDisplay } from './components/LiveDisplay';
import { StandaloneLiveDisplay } from './components/StandaloneLiveDisplay';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

const TEAM_COLORS = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500'
];

const TEAM_LIGHT_COLORS = [
  'bg-blue-100 border-blue-200',
  'bg-green-100 border-green-200',
  'bg-purple-100 border-purple-200', 
  'bg-orange-100 border-orange-200',
  'bg-pink-100 border-pink-200'
];

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [showLiveDisplay, setShowLiveDisplay] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [numTeams, setNumTeams] = useState<number>(3);
  const [teamNames, setTeamNames] = useState<string[]>(['', '', '']);
  const [scoreInputs, setScoreInputs] = useState<{ [key: string]: string }>({});

  // Check if this is a standalone live display
  const isStandaloneLive = window.location.pathname === '/live' || window.location.search.includes('session=');

  // If this is a standalone live display, render only that
  if (isStandaloneLive) {
    return <StandaloneLiveDisplay />;
  }

  useEffect(() => {
    // Check for imported data in URL
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    if (dataParam) {
      try {
        const importedTeams = JSON.parse(atob(dataParam));
        setTeams(importedTeams);
        setShowSetup(false);
        const inputs: { [key: string]: string } = {};
        importedTeams.forEach((team: Team) => {
          inputs[team.id] = '';
        });
        setScoreInputs(inputs);
      } catch (error) {
        console.error('Error importing data from URL:', error);
      }
    }

    // Initialize team names array when numTeams changes
    const newNames = Array(numTeams).fill('').map((_, i) => teamNames[i] || '');
    setTeamNames(newNames);
  }, [numTeams]);

  const setupTeams = () => {
    const validNames = teamNames.map((name, i) => 
      name.trim() || `Team ${i + 1}`
    );

    const newTeams: Team[] = validNames.map((name, i) => ({
      id: `team-${i}`,
      name,
      score: 0,
      color: TEAM_COLORS[i]
    }));

    setTeams(newTeams);
    setShowSetup(false);
    
    // Initialize score inputs
    const inputs: { [key: string]: string } = {};
    newTeams.forEach(team => {
      inputs[team.id] = '';
    });
    setScoreInputs(inputs);
  };

  const updateScore = (teamId: string, points: string) => {
    const numPoints = parseInt(points);
    if (isNaN(numPoints)) return;

    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, score: Math.max(0, team.score + numPoints) }
        : team
    ));

    // Clear the input
    setScoreInputs(prev => ({ ...prev, [teamId]: '' }));
  };

  const resetScores = () => {
    setTeams(prev => prev.map(team => ({ ...team, score: 0 })));
  };

  const backToSetup = () => {
    setShowSetup(true);
    setTeams([]);
    setShowLiveDisplay(false);
    setShowSync(false);
  };

  const handleImportTeams = (importedTeams: Team[]) => {
    setTeams(importedTeams);
    setShowSetup(false);
    const inputs: { [key: string]: string } = {};
    importedTeams.forEach(team => {
      inputs[team.id] = '';
    });
    setScoreInputs(inputs);
  };

  const getLeaderboard = () => {
    return [...teams].sort((a, b) => b.score - a.score);
  };

  const maxScore = Math.max(...teams.map(t => t.score));

  // Live Display Mode
  if (showLiveDisplay) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowLiveDisplay(false)}
          className="absolute top-4 right-4 z-10 px-4 py-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors duration-200"
        >
          Exit Live Display
        </button>
        <LiveDisplay teams={teams} />
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quiz Scoreboard</h1>
            <p className="text-gray-600">Set up your teams to get started</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Number of Teams
              </label>
              <div className="flex gap-2">
                {[3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setNumTeams(num)}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                      numTeams === num
                        ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    {num} Teams
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Team Names
              </label>
              <div className="space-y-3">
                {Array(numTeams).fill(0).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    value={teamNames[i] || ''}
                    onChange={(e) => {
                      const newNames = [...teamNames];
                      newNames[i] = e.target.value;
                      setTeamNames(newNames);
                    }}
                    placeholder={`Team ${i + 1}`}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={setupTeams}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Quiz Scoreboard</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSync(!showSync)}
                className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 font-medium"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Sync
              </button>
              <button
                onClick={() => setShowLiveDisplay(true)}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Live Display
              </button>
              <button
                onClick={resetScores}
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Scores
              </button>
              <button
                onClick={backToSetup}
                className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Setup
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Presentation Sync Panel */}
        {showSync && (
          <div className="mb-8">
            <PresentationSync teams={teams} onImportTeams={handleImportTeams} />
          </div>
        )}

        {/* Leaderboard */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Leaderboard
          </h2>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="space-y-4">
              {getLeaderboard().map((team, index) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${
                    TEAM_LIGHT_COLORS[teams.findIndex(t => t.id === team.id)]
                  } ${index === 0 ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                    <span className="font-semibold text-gray-800 text-lg">{team.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {maxScore > 0 && (
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${team.color}`}
                          style={{ width: `${(team.score / maxScore) * 100}%` }}
                        ></div>
                      </div>
                    )}
                    <span className="text-2xl font-bold text-gray-800 min-w-16 text-right">
                      {team.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, index) => (
            <div key={team.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className={`${team.color} px-6 py-4`}>
                <h3 className="text-xl font-bold text-white">{team.name}</h3>
                <p className="text-white opacity-90">Current Score</p>
              </div>
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-800 mb-2">
                    {team.score}
                  </div>
                  <div className="text-sm text-gray-500">Points</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={scoreInputs[team.id] || ''}
                      onChange={(e) => setScoreInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                      placeholder="Enter points"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => updateScore(team.id, scoreInputs[team.id] || '0')}
                      disabled={!scoreInputs[team.id]}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                    >
                      Update
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[1, 5, 10, 25].map(points => (
                      <button
                        key={points}
                        onClick={() => updateScore(team.id, points.toString())}
                        className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium text-sm"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {points}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[1, 5, 10, 25].map(points => (
                      <button
                        key={points}
                        onClick={() => updateScore(team.id, (-points).toString())}
                        className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium text-sm"
                      >
                        <Minus className="w-3 h-3 mr-1" />
                        {points}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;