import React from 'react';
import { History, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { ScoreHistoryEntry } from '../../types';

interface ScoreHistoryProps {
  history: ScoreHistoryEntry[];
  onRefresh: () => void;
}

export function ScoreHistory({ history, onRefresh }: ScoreHistoryProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <History className="w-6 h-6 mr-2 text-indigo-500" />
          Score History
        </h3>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No score changes yet</p>
          <p className="text-sm">Score updates will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                {getChangeIcon(entry.changeAmount)}
                <div>
                  <div className="font-medium text-gray-800">
                    {entry.teamName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">{entry.oldScore}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-bold text-gray-800">{entry.newScore}</span>
                </div>
                <div className={`text-sm font-medium ${getChangeColor(entry.changeAmount)}`}>
                  {entry.changeAmount > 0 ? '+' : ''}{entry.changeAmount}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}