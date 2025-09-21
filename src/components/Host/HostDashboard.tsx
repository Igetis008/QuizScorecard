import React, { useState, useEffect } from 'react';
import { Plus, Minus, RotateCcw, Trophy, Users, Settings, Monitor, Share2, History, Presentation, Download } from 'lucide-react';
import { socketService } from '../../services/socket';
import { apiService } from '../../services/api';
import { Team, ScoreHistoryEntry, SlideTemplate } from '../../types';
import { SlideIntegration } from './SlideIntegration';
import { ScoreHistory } from './ScoreHistory';

interface HostDashboardProps {
  session: any;
  user: any;
  onLogout: () => void;
}

export function HostDashboard({ session: initialSession, user, onLogout }: HostDashboardProps) {
  const [session, setSession] = useState(initialSession);
  const [teams, setTeams] = useState<Team[]>(initialSession.teams || []);
  const [scoreInputs, setScoreInputs] = useState<{ [key: string]: string }>({});
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showSlideIntegration, setShowSlideIntegration] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [slideTemplates, setSlideTemplates] = useState<SlideTemplate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  useEffect(() => {
    // Initialize score inputs
    const inputs: { [key: string]: string } = {};
    teams.forEach(team => {
      inputs[team.id] = '';
    });
    setScoreInputs(inputs);

    // Connect to socket
    socketService.connect();
    
    socketService.on('connected', () => {
      setConnectionStatus('connected');
      socketService.joinSession(session.sessionId || session.id, true, apiService.getToken()!);
    });

    socketService.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    socketService.on('session-joined', (data) => {
      console.log('Host joined session:', data);
    });

    socketService.on('score-updated', (data) => {
      setTeams(data.teams);
      setScoreInputs(prev => ({ ...prev, [data.teamId]: '' }));
    });

    socketService.on('scores-reset', (data) => {
      setTeams(data.teams);
      const inputs: { [key: string]: string } = {};
      data.teams.forEach((team: Team) => {
        inputs[team.id] = '';
      });
      setScoreInputs(inputs);
    });

    socketService.on('spectator-joined', (data) => {
      setSpectatorCount(data.count);
    });

    socketService.on('spectator-left', (data) => {
      setSpectatorCount(data.count);
    });

    socketService.on('slide-update-available', (data) => {
      console.log('Slide update available:', data);
      // Handle slide update notification
    });

    socketService.on('error', (data) => {
      console.error('Socket error:', data.message);
    });

    // Load initial data
    loadScoreHistory();
    loadSlideTemplates();

    return () => {
      socketService.disconnect();
    };
  }, [session.sessionId || session.id]);

  const loadScoreHistory = async () => {
    try {
      const history = await apiService.getScoreHistory(session.sessionId || session.id);
      setScoreHistory(history);
    } catch (error) {
      console.error('Failed to load score history:', error);
    }
  };

  const loadSlideTemplates = async () => {
    try {
      const templates = await apiService.getTemplates(session.sessionId || session.id);
      setSlideTemplates(templates);
    } catch (error) {
      console.error('Failed to load slide templates:', error);
    }
  };

  const updateScore = (teamId: string, points: string) => {
    const numPoints = parseInt(points);
    if (isNaN(numPoints)) return;

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const newScore = Math.max(0, team.score + numPoints);
    socketService.updateScore(teamId, newScore, numPoints);
  };

  const resetScores = () => {
    if (confirm('Are you sure you want to reset all scores to 0?')) {
      socketService.resetScores();
    }
  };

  const getLeaderboard = () => {
    return [...teams].sort((a, b) => b.score - a.score);
  };

  const maxScore = Math.max(...teams.map(t => t.score));

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

  const shareUrl = `${window.location.origin}/spectator?room=${session.roomCode}`;

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
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{session.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Room: <strong>{session.roomCode}</strong></span>
                  <span className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-1 ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    {connectionStatus}
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {spectatorCount} spectators
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 font-medium"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </button>
              <button
                onClick={() => setShowSlideIntegration(!showSlideIntegration)}
                className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 font-medium"
              >
                <Presentation className="w-4 h-4 mr-2" />
                Slides
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
              <button
                onClick={resetScores}
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </button>
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Slide Integration Panel */}
        {showSlideIntegration && (
          <div className="mb-8">
            <SlideIntegration 
              sessionId={session.sessionId || session.id}
              teams={teams}
              templates={slideTemplates}
              onTemplateUploaded={loadSlideTemplates}
            />
          </div>
        )}

        {/* Score History Panel */}
        {showHistory && (
          <div className="mb-8">
            <ScoreHistory 
              history={scoreHistory}
              onRefresh={loadScoreHistory}
            />
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
                      disabled={!scoreInputs[team.id] || connectionStatus !== 'connected'}
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
                        disabled={connectionStatus !== 'connected'}
                        className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium text-sm disabled:opacity-50"
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
                        disabled={connectionStatus !== 'connected'}
                        className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium text-sm disabled:opacity-50"
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