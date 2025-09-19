import { useState, useEffect, useCallback } from 'react';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface SyncData {
  teams: Team[];
  timestamp: number;
  sessionId: string;
}

export function useRealTimeSync(teams: Team[], sessionId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Generate a unique session ID if not provided
  const currentSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Save data to localStorage with timestamp
  const saveToStorage = useCallback((data: Team[]) => {
    const syncData: SyncData = {
      teams: data,
      timestamp: Date.now(),
      sessionId: currentSessionId
    };
    localStorage.setItem('scoreboard-sync', JSON.stringify(syncData));
    setLastUpdate(syncData.timestamp);
  }, [currentSessionId]);

  // Load data from localStorage
  const loadFromStorage = useCallback((): SyncData | null => {
    try {
      const stored = localStorage.getItem('scoreboard-sync');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
    return null;
  }, []);

  // Update teams data
  const updateTeams = useCallback((newTeams: Team[]) => {
    saveToStorage(newTeams);
  }, [saveToStorage]);

  // Check for updates
  const checkForUpdates = useCallback((): SyncData | null => {
    const stored = loadFromStorage();
    if (stored && stored.timestamp > lastUpdate) {
      setLastUpdate(stored.timestamp);
      return stored;
    }
    return null;
  }, [lastUpdate, loadFromStorage]);

  // Initialize sync
  useEffect(() => {
    if (teams.length > 0) {
      saveToStorage(teams);
      setIsConnected(true);
    }
  }, [teams, saveToStorage]);

  return {
    isConnected,
    currentSessionId,
    updateTeams,
    checkForUpdates,
    lastUpdate
  };
}