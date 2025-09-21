export interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
  position?: number;
}

export interface QuizSession {
  id: string;
  title: string;
  roomCode: string;
  hostId?: number;
  teams: Team[];
  status?: 'active' | 'completed';
  createdAt?: string;
}

export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ScoreHistoryEntry {
  id: number;
  sessionId: string;
  teamId: string;
  teamName: string;
  oldScore: number;
  newScore: number;
  changeAmount: number;
  timestamp: string;
}

export interface SlideTemplate {
  id: string;
  sessionId: string;
  platform: 'powerpoint' | 'google-slides' | 'canva';
  mappingConfig: string;
  createdAt: string;
}

export interface SlideUpdateData {
  type: 'json' | 'api-instructions' | 'manual-update';
  data: any;
  filename: string;
}

export interface SocketEvents {
  'join-session': (data: { sessionId: string; isHost: boolean; token?: string }) => void;
  'session-joined': (data: { isHost: boolean; session: any }) => void;
  'update-score': (data: { teamId: string; newScore: number; changeAmount: number }) => void;
  'score-updated': (data: { teamId: string; newScore: number; changeAmount: number; teams: Team[] }) => void;
  'reset-scores': () => void;
  'scores-reset': (data: { teams: Team[] }) => void;
  'spectator-joined': (data: { count: number }) => void;
  'spectator-left': (data: { count: number }) => void;
  'slide-update-available': (data: { templateId: string; platform: string; updateData: SlideUpdateData }) => void;
  'error': (data: { message: string }) => void;
}