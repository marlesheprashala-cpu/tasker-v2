export interface TaskStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textColor: string;
  bgColor: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  styles: TaskStyle;
  createdAt: number;
}

export interface Reminder {
  id: string;
  text: string;
  date: string; // ISO date string YYYY-MM-DD
  completed: boolean;
}

export interface DayLog {
  id: string;
  date: string; // ISO string or formatted date
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  isEnded: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  messages: ChatMessage[];
}

export enum AppView {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  ACTIVE_DAY = 'ACTIVE_DAY',
  SUMMARY = 'SUMMARY',
  HISTORY_VIEW = 'HISTORY_VIEW',
  REMINDERS = 'REMINDERS'
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}
