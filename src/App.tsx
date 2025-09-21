import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/Auth/LoginForm';
import { QuizSetup } from './components/Setup/QuizSetup';
import { HostDashboard } from './components/Host/HostDashboard';
import { JoinSession } from './components/Spectator/JoinSession';
import { SpectatorView } from './components/Spectator/SpectatorView';
import { apiService } from './services/api';

type AppState = 'login' | 'setup' | 'host' | 'join' | 'spectator';

function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [user, setUser] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Check URL for spectator mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
      setAppState('join');
    } else if (apiService.isAuthenticated()) {
      setAppState('setup');
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setAppState('setup');
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setCurrentSession(null);
    setAppState('login');
  };

  const handleSessionCreated = (session: any) => {
    setCurrentSession(session);
    setAppState('host');
  };

  const handleSessionJoined = (session: any) => {
    setCurrentSession(session);
    setAppState('spectator');
  };

  const handleBackToSetup = () => {
    setCurrentSession(null);
    setAppState('setup');
  };

  // Render based on current state
  switch (appState) {
    case 'login':
      return <LoginForm onLogin={handleLogin} />;
    
    case 'setup':
      return (
        <QuizSetup 
          user={user} 
          onSessionCreated={handleSessionCreated}
        />
      );
    
    case 'host':
      return (
        <HostDashboard 
          session={currentSession}
          user={user}
          onLogout={handleLogout}
        />
      );
    
    case 'join':
      return <JoinSession onSessionJoined={handleSessionJoined} />;
    
    case 'spectator':
      return <SpectatorView session={currentSession} />;
    
    default:
      return <LoginForm onLogin={handleLogin} />;
  }
}

export default App;