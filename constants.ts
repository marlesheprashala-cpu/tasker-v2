import { TaskStyle } from "./types";

export const PRO_TIPS = [
  "Break big tasks into smaller, manageable chunks to avoid overwhelm.",
  "Use the 'Eat That Frog' method: Do the hardest task first thing in the morning.",
  "Review your goals daily to stay aligned with your long-term vision.",
  "Take regular breaks. The Pomodoro technique (25m work, 5m break) is great.",
  "Multitasking is a myth. Focus on one thing at a time for deep work.",
  "Declutter your workspace before starting your day to clear your mind.",
  "Hydrate! Your brain needs water to function at peak efficiency.",
  "Reflect on what went well today to build confidence for tomorrow."
];

export const DEFAULT_TASK_STYLE: TaskStyle = {
  bold: false,
  italic: false,
  underline: false,
  textColor: '#ffffff', // Default white for dark mode compatibility
  bgColor: 'transparent',
};

export const TEXT_COLORS = [
  '#ffffff', // White
  '#000000', // Black
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Orange
  '#ec4899', // Pink
];

export const BG_COLORS = [
  'transparent',
  '#1e293b', // Slate
  '#7f1d1d', // Red 900
  '#14532d', // Green 900
  '#1e3a8a', // Blue 900
  '#831843', // Pink 900
];
