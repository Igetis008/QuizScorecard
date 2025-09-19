import React, { useState } from 'react';
import { Download, Upload, RefreshCw, Monitor, FileText, Presentation } from 'lucide-react';
import { useRealTimeSync } from '../hooks/useRealTimeSync';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface PresentationSyncProps {
  teams: Team[];
  onImportTeams: (teams: Team[]) => void;
}

export function PresentationSync({ teams, onImportTeams }: PresentationSyncProps) {
  const [syncMethod, setSyncMethod] = useState<'json' | 'csv' | 'url'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const { currentSessionId, updateTeams, isConnected } = useRealTimeSync(teams, '');

  // Update real-time sync when teams change
  React.useEffect(() => {
    if (teams.length > 0) {
      updateTeams(teams);
    }
  }, [teams, updateTeams]);

  const exportToJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      teams: teams.map(team => ({
        name: team.name,
        score: team.score,
        rank: teams.sort((a, b) => b.score - a.score).findIndex(t => t.id === team.id) + 1
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scoreboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const csvContent = [
      'Rank,Team Name,Score',
      ...sortedTeams.map((team, index) => `${index + 1},${team.name},${team.score}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scoreboard-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateShareableUrl = () => {
    setIsExporting(true);
    
    // Update localStorage with current data
    updateTeams(teams);
    
    setTimeout(() => {
      // Create a URL that will load the live display with real-time updates
      const url = `${window.location.origin}/live?session=${currentSessionId}`;
      setShareUrl(url);
      setIsExporting(false);
    }, 1000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedTeams: Team[] = [];

        if (file.type === 'application/json') {
          const data = JSON.parse(content);
          importedTeams = data.teams.map((team: any, index: number) => ({
            id: `team-${index}`,
            name: team.name,
            score: team.score || 0,
            color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'][index]
          }));
        } else if (file.type === 'text/csv') {
          const lines = content.split('\n').slice(1); // Skip header
          importedTeams = lines.filter(line => line.trim()).map((line, index) => {
            const [, name, score] = line.split(',');
            return {
              id: `team-${index}`,
              name: name.trim(),
              score: parseInt(score) || 0,
              color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'][index]
            };
          });
        }

        if (importedTeams.length > 0) {
          onImportTeams(importedTeams);
        }
      } catch (error) {
        console.error('Error importing file:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <Presentation className="w-6 h-6 mr-2 text-blue-500" />
        Presentation Integration
      </h3>

      <div className="space-y-6">
        {/* Export Options */}
        <div>
          <h4 className="text-lg font-medium text-gray-700 mb-4">Export Scoreboard Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={exportToJSON}
              className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={generateShareableUrl}
              disabled={isExporting}
              className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 font-medium disabled:opacity-50"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Monitor className="w-4 h-4 mr-2" />
              )}
              Generate URL
            </button>
          </div>
        </div>

        {/* Shareable URL */}
        {shareUrl && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-2 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live Scoreboard URL (Real-time Updates)
            </h5>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={() => copyToClipboard(shareUrl)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm"
              >
                Copy
              </button>
              <button
                onClick={() => window.open(shareUrl, '_blank')}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 text-sm"
              >
                Open
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 bg-green-50 p-2 rounded border-l-2 border-green-400">
              ✅ This URL updates in real-time automatically. Open it once and it will stay synchronized with your controller.
            </p>
          </div>
        )}

        {/* Import Options */}
        <div>
          <h4 className="text-lg font-medium text-gray-700 mb-4">Import Team Data</h4>
          <div className="flex items-center space-x-4">
            <label className="flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import File
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-500">
              Supports JSON and CSV files
            </span>
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-3">Integration Instructions</h5>
          <div className="space-y-3 text-sm text-blue-700">
            <div>
              <strong>PowerPoint:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Export data as JSON/CSV and use Power Automate to update slides</li>
                <li>Use the shareable URL in a web browser frame within your slide</li>
                <li>Take screenshots of the scoreboard for static updates</li>
              </ol>
            </div>
            <div>
              <strong>Google Slides:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Insert → Web frame → Paste the shareable URL for live updates</li>
                <li>Use Google Apps Script to import CSV data automatically</li>
                <li>Copy scoreboard data and paste into text boxes</li>
              </ol>
            </div>
            <div>
              <strong>Canva:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Export CSV and manually update text elements</li>
                <li>Use Canva's data visualization tools with exported data</li>
                <li>Take screenshots for image-based updates</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}