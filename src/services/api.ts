import { AuthResponse, QuizSession, Team, ScoreHistoryEntry, SlideTemplate } from '../types';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}/api${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Authentication
  async register(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Quiz Sessions
  async createSession(title: string, teams: Omit<Team, 'id' | 'score'>[]): Promise<QuizSession> {
    return this.request<QuizSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, teams }),
    });
  }

  async getSession(sessionId: string): Promise<QuizSession> {
    return this.request<QuizSession>(`/sessions/${sessionId}`);
  }

  async joinSession(roomCode: string): Promise<QuizSession & { isSpectator: boolean }> {
    return this.request<QuizSession & { isSpectator: boolean }>('/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    });
  }

  async getScoreHistory(sessionId: string): Promise<ScoreHistoryEntry[]> {
    return this.request<ScoreHistoryEntry[]>(`/sessions/${sessionId}/history`);
  }

  // Slide Templates
  async uploadTemplate(
    sessionId: string,
    platform: string,
    mappingConfig: any,
    file?: File
  ): Promise<SlideTemplate> {
    const formData = new FormData();
    formData.append('platform', platform);
    formData.append('mappingConfig', JSON.stringify(mappingConfig));
    if (file) {
      formData.append('template', file);
    }

    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/templates`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async getTemplates(sessionId: string): Promise<SlideTemplate[]> {
    return this.request<SlideTemplate[]>(`/sessions/${sessionId}/templates`);
  }

  async exportSlides(sessionId: string, templateId: string): Promise<any> {
    return this.request<any>(`/sessions/${sessionId}/export-slides`, {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService();