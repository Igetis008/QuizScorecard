import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Users, Wifi, WifiOff } from 'lucide-react';
import { socketService } from '../../services/socket';
import { Team } from '../../types';

interface SpectatorViewProps {
  session: any;
}

export function SpectatorView({ session: initialSession }: SpectatorViewProps) {
  const [session, setSession] = useState(initialSession);
  const [teams, setTeams] = useState<Team[]>(initialSession.teams || []);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Connect to socket
    socketService.connect();
    
    socketService.on('connected', () => {
      setConnectionStatus('connected');
      socketService.joinSession(session.sessionId || session.id, false);
    });

    socketService.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    socketService.on('session-joined', (data) => {
      console.log('Spectator joined session:', data);
      if (data.session && data.session.teams) {
        setTeams(data.session.teams);
      }
    });

    socketService.on('score-updated', (data) => {
      setTeams(data.teams);
      setLastUpdate(new Date());
    });

    socketService.on('scores-reset', (data) => {
      setTeams(data.teams);
      setLastUpdate(new Date());
    });

    socketService.on('error', (data) => {
      console.error('Socket error:', data.message);
    });

    return () => {
      socketService.disconnect();
    };
  }, [session.sessionId || session.id]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {session.title}
          </h1>
          <div className="flex items-center justify-center space-x-4 text-white/70 text-sm md:text-base">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <span className="capitalize">{connectionStatus}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Room: {session.roomCode}</span>
            </div>
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full mt-4"></div>
        </div>

        {/* Podium Style Display for Top 3 */}
        {sortedTeams.length >= 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
            {sortedTeams.slice(0, 3).map((team, index) => {
              const rank = index + 1;
              const height = rank === 1 ? 'h-48 md:h-64' : rank === 2 ? 'h-40 md:h-48' : 'h-32 md:h-40';
              
              return (
                <div key={team.id} className={`${rank === 1 ? 'lg:order-2' : rank === 2 ? 'lg:order-1' : 'lg:order-3'}`}>
                  <div className={`${getRankBadge(rank)} ${height} rounded-2xl shadow-2xl flex flex-col justify-end p-4 md:p-6 relative overflow-hidden`}>
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
                      <div className="text-3xl md:text-4xl font-bold mb-2">{team.score}</div>
                      <div className="text-lg md:text-xl font-semibold opacity-90">{team.name}</div>
                      <div className="text-xs md:text-sm opacity-75 mt-1">
                        {rank === 1 ? '🏆 Champion' : rank === 2 ? '🥈 Runner-up' : '🥉 Third Place'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All Teams List */}
        <div className="space-y-3 md:space-y-4">
          {sortedTeams.length < 3 && (
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-6 md:mb-8">Leaderboard</h2>
          )}
          {(sortedTeams.length < 3 ? sortedTeams : sortedTeams.slice(3)).map((team, index) => {
            const rank = sortedTeams.length < 3 ? index + 1 : index + 4;
            return (
              <div key={team.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 md:space-x-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg md:text-xl">
                      {rank}
                    </div>
                    <div>
                      <div className="text-xl md:text-2xl font-bold text-white">{team.name}</div>
                      <div className="text-white/70 text-sm md:text-base">
                        {sortedTeams.length < 3 && rank <= 3 ? 
                          (rank === 1 ? 'Leading' : rank === 2 ? 'Second Place' : 'Third Place') : 
                          'Competitor'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl md:text-4xl font-bold text-white">{team.score}</div>
                    <div className="text-white/70 text-sm md:text-base">Points</div>
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

        {/* Footer */}
        <div className="text-center mt-8 md:mt-12">
          <div className="text-white/60 text-sm md:text-lg">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}