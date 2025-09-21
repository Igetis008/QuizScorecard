import { io, Socket } from 'socket.io-client';
import { SocketEvents, Team } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(serverUrl?: string): Socket {
    const url = serverUrl || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('connection_error', error);
    });

    // Set up event forwarding
    const events: (keyof SocketEvents)[] = [
      'session-joined',
      'score-updated',
      'scores-reset',
      'spectator-joined',
      'spectator-left',
      'slide-update-available',
      'error'
    ];

    events.forEach(event => {
      this.socket?.on(event, (data) => {
        this.emit(event, data);
      });
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinSession(sessionId: string, isHost: boolean = false, token?: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join-session', { sessionId, isHost, token });
  }

  updateScore(teamId: string, newScore: number, changeAmount: number): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('update-score', { teamId, newScore, changeAmount });
  }

  resetScores(): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('reset-scores');
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void;
  on(event: string, callback: Function): void;
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();