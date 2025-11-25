export enum AppStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  CONNECTED = 'CONNECTED',
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'stranger' | 'system';
  text: string;
  timestamp: number;
}

export interface UserSettings {
  myGender: 'male' | 'female' | 'non-binary';
  preference: 'male' | 'female' | 'anyone';
}

export interface ChatState {
  status: AppStatus;
  messages: ChatMessage[];
  partnerIsTyping: boolean;
  onlineCount: number;
}

export interface TestMetric {
  id: number;
  status: 'SUCCESS' | 'FAILED';
  latency: number;
  timestamp: number;
}

export interface TestReportData {
  totalUsers: number;
  successfulMatches: number;
  avgLatency: number;
  memoryUsage: string;
  fps: number;
  metrics: TestMetric[];
}