import React from 'react';
import { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { useRealTimeSync } from '../hooks/useRealTimeSync';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface LiveDisplayProps {
  teams: Team[];
  isStandalone?: boolean;
}

export function LiveDisplay({ teams: initialTeams, isStandalone = false }: LiveDisplayProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const { checkForUpdates } = useRealTimeSync(teams, '');

  // Real-time updates for standalone display
  useEffect(() => {
    if (!isStandalone) {
      setTeams(initialTeams);
      return;
    }

    // Check for updates every 500ms when in standalone mode
    const interval = setInterval(() => {
      const update = checkForUpdates();
      if (update && update.teams) {
        setTeams(update.teams);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [initialTeams, isStandalone, checkForUpdates]);

  // Load initial data from URL or localStorage for standalone mode
  useEffect(() => {
    if (isStandalone) {
      // Check URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('data');
      
      if (dataParam) {
        try {
          const importedTeams = JSON.parse(atob(dataParam));
          setTeams(importedTeams);
        } catch (error) {
          console.error('Error importing data from URL:', error);
        }
      } else {
        // Check localStorage
        try {
          const stored = localStorage.getItem('scoreboard-sync');
          if (stored) {
            const syncData = JSON.parse(stored);
            if (syncData.teams) {
              setTeams(syncData.teams);
            }
          }
        } catch (error) {
          console.error('Error loading from localStorage:', error);
        }
      }
    }
  }, [isStandalone]);

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...teams.map(t => t.score));

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 3:
        return <Award className="w-8 h-8 text-orange-600" />;
      default:
        return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">{rank}</div>;
    }
  };

  const getRankBadge = (rank: number) => {
    const colors = {
      1: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
      2: 'bg-gradient-to-r from-gray-300 to-gray-500',
      3: 'bg-gradient-to-r from-orange-400 to-orange-600'
    };
    return colors[rank as keyof typeof colors] || 'bg-gradient-to-r from-gray-200 to-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            Live Scoreboard
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
        </div>

        {/* Podium Style Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {sortedTeams.slice(0, 3).map((team, index) => {
            const rank = index + 1;
            const height = rank === 1 ? 'h-64' : rank === 2 ? 'h-48' : 'h-40';
            
            return (
              <div key={team.id} className={`${rank === 1 ? 'lg:order-2' : rank === 2 ? 'lg:order-1' : 'lg:order-3'}`}>
                <div className={`${getRankBadge(rank)} ${height} rounded-2xl shadow-2xl flex flex-col justify-end p-6 relative overflow-hidden`}>
                  {/* Rank Badge */}
                  <div className="absolute top-4 left-4">
                    {getRankIcon(rank)}
                  </div>
                  
                  {/* Confetti effect for winner */}
                  {rank === 1 && (
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 left-8 w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="absolute top-8 right-8 w-1 h-1 bg-white rounded-full animate-bounce delay-100"></div>
                      <div className="absolute top-12 left-12 w-1 h-1 bg-white rounded-full animate-bounce delay-200"></div>
                    </div>
                  )}
                  
                  <div className="text-center text-white">
                    <div className="text-4xl font-bold mb-2">{team.score}</div>
                    <div className="text-xl font-semibold opacity-90">{team.name}</div>
                    <div className="text-sm opacity-75 mt-1">
                      {rank === 1 ? '🏆 Champion' : rank === 2 ? '🥈 Runner-up' : '🥉 Third Place'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Remaining Teams */}
        {sortedTeams.length > 3 && (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Other Competitors</h2>
            {sortedTeams.slice(3).map((team, index) => {
              const rank = index + 4;
              return (
                <div key={team.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                        {rank}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{team.name}</div>
                        <div className="text-white/70">Competitor</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-white">{team.score}</div>
                      <div className="text-white/70">Points</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {maxScore > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${(team.score / maxScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="text-white/60 text-lg">
            {isStandalone ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Updates Active - Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            ) : (
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}