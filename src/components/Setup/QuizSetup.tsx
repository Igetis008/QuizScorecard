import React, { useState } from 'react';
import { Trophy, Plus, Minus, Play } from 'lucide-react';
import { apiService } from '../../services/api';
import { Team } from '../../types';

interface QuizSetupProps {
  user: any;
  onSessionCreated: (session: any) => void;
}

const TEAM_COLORS = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-teal-500',
  'bg-cyan-500'
];

export function QuizSetup({ user, onSessionCreated }: QuizSetupProps) {
  const [title, setTitle] = useState('');
  const [numTeams, setNumTeams] = useState(3);
  const [teamNames, setTeamNames] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateTeamCount = (count: number) => {
    const newCount = Math.max(2, Math.min(20, count));
    setNumTeams(newCount);
    
    const newNames = Array(newCount).fill('').map((_, i) => 
      teamNames[i] || `Team ${i + 1}`
    );
    setTeamNames(newNames);
  };

  const updateTeamName = (index: number, name: string) => {
    const newNames = [...teamNames];
    newNames[index] = name;
    setTeamNames(newNames);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Quiz title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const teams = teamNames.map((name, index) => ({
        name: name.trim() || `Team ${index + 1}`,
        color: TEAM_COLORS[index % TEAM_COLORS.length]
      }));

      const session = await apiService.createSession(title.trim(), teams);
      onSessionCreated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Quiz Session</h1>
          <p className="text-gray-600">Set up your quiz and configure teams</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Quiz Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Number of Teams
            </label>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => updateTeamCount(numTeams - 1)}
                disabled={numTeams <= 2}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-bold text-gray-800 min-w-12 text-center">
                {numTeams}
              </span>
              <button
                type="button"
                onClick={() => updateTeamCount(numTeams + 1)}
                disabled={numTeams >= 20}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">2-20 teams supported</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Team Names
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {Array(numTeams).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${TEAM_COLORS[i % TEAM_COLORS.length]}`}></div>
                  <input
                    type="text"
                    value={teamNames[i] || ''}
                    onChange={(e) => updateTeamName(i, e.target.value)}
                    placeholder={`Team ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating Session...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Play className="w-5 h-5 mr-2" />
                Start Quiz Session
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}