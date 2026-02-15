import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Moon, 
  Sun, 
  Menu, 
  ArrowLeft, 
  BarChart3,
  Edit3,
  Bold,
  Italic,
  Underline,
  Palette,
  Type,
  Bell,
  Clock,
  Calendar as CalendarIcon,
  History,
  X,
  LogOut
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { AppView, Task, DayLog, TaskStyle, Reminder } from './types';
import { PRO_TIPS, DEFAULT_TASK_STYLE, TEXT_COLORS, BG_COLORS } from './constants';
import { CalendarWidget } from './components/CalendarWidget';
import { AiAssistant } from './components/AiAssistant';

// Helper to parse YYYY-MM-DD or ISO strings to local Date object
const parseISO = (str: string) => {
   const [y, m, d] = str.split(/[-T]/).map(Number);
   return new Date(y, m - 1, d);
};

// --- Splash Screen Component ---
const SplashScreen: React.FC = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-white">
    <div className="text-center animate-fade-in-up">
      <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-2xl mx-auto mb-6 shadow-2xl shadow-pink-500/50 flex items-center justify-center animate-pulse">
        <CheckCircle2 size={48} className="text-white" />
      </div>
      <h1 className="text-6xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
        Tasker
      </h1>
      <p className="mt-4 text-gray-400 text-sm tracking-widest uppercase">Future of Productivity</p>
    </div>
  </div>
);

// --- Task Item Component ---
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  readOnly?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onEdit, readOnly = false }) => {
  return (
    <div 
      className={`group relative flex items-center gap-3 p-4 rounded-xl transition-all duration-300 border border-white/5 hover:border-pink-500/30 ${
        task.completed ? 'bg-green-500/10' : 'bg-red-500/5'
      }`}
      style={{ backgroundColor: task.styles.bgColor !== 'transparent' ? task.styles.bgColor : undefined }}
    >
      <button 
        onClick={() => !readOnly && onToggle(task.id)}
        className={`flex-shrink-0 transition-colors ${
          task.completed ? 'text-green-500' : 'text-red-400 hover:text-red-500'
        }`}
        disabled={readOnly}
      >
        {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      <div className="flex-1 min-w-0">
        <p 
          className={`break-words text-lg transition-all ${
            task.completed ? 'line-through opacity-50' : ''
          }`}
          style={{
            fontWeight: task.styles.bold ? 'bold' : 'normal',
            fontStyle: task.styles.italic ? 'italic' : 'normal',
            textDecoration: task.styles.underline ? 'underline' : 'none',
            color: task.styles.textColor,
          }}
        >
          {task.text}
        </p>
      </div>

      {!readOnly && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(task)}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg"
          >
            <Edit3 size={18} />
          </button>
          <button 
            onClick={() => onDelete(task.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.SPLASH);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Data State with Lazy Initialization
  // This ensures data is read from localStorage BEFORE the initial render
  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>(() => {
    try {
      const saved = localStorage.getItem('tasker_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error loading tasks:", e);
      return {};
    }
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    try {
      const saved = localStorage.getItem('tasker_reminders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading reminders:", e);
      return [];
    }
  });

  const [history, setHistory] = useState<DayLog[]>(() => {
    try {
      const saved = localStorage.getItem('tasker_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading history:", e);
      return [];
    }
  });
  
  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskInput, setTaskInput] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [inputStyle, setInputStyle] = useState<TaskStyle>(DEFAULT_TASK_STYLE);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'bg' | null>(null);
  const [dailyTip, setDailyTip] = useState(PRO_TIPS[0]);

  // Sidebar & Navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  // Reminders Input
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderInput, setReminderInput] = useState('');
  const [reminderDate, setReminderDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // End Day Modal
  const [showEndDayOptions, setShowEndDayOptions] = useState(false);

  // History Detail View
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<DayLog | null>(null);

  // Derived state
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const currentTasks = tasksMap[dateKey] || [];

  // Used to prevent saving during the very first render cycle (extra safety)
  const isMounted = useRef(false);

  // Initial Splash Timer
  useEffect(() => {
    // Data is already loaded via lazy init in useState above
    const timer = setTimeout(() => {
      setView(AppView.HOME);
    }, 2000);
    isMounted.current = true;
    return () => clearTimeout(timer);
  }, []);

  // Save on updates
  useEffect(() => {
    if (isMounted.current) {
        localStorage.setItem('tasker_tasks', JSON.stringify(tasksMap));
    }
  }, [tasksMap]);

  useEffect(() => {
    if (isMounted.current) {
        localStorage.setItem('tasker_history', JSON.stringify(history));
    }
  }, [history]);

  useEffect(() => {
    if (isMounted.current) {
        localStorage.setItem('tasker_reminders', JSON.stringify(reminders));
    }
  }, [reminders]);


  const handleStartDay = () => {
    setCurrentDate(new Date());
    setView(AppView.ACTIVE_DAY);
    setDailyTip(PRO_TIPS[Math.floor(Math.random() * PRO_TIPS.length)]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleEndDayClick = () => {
    setShowEndDayOptions(true);
  };

  const closeDay = () => {
      const completedCount = currentTasks.filter(t => t.completed).length;
      const totalCount = currentTasks.length;

      const newLog: DayLog = {
          id: crypto.randomUUID(),
          date: dateKey,
          tasks: [...currentTasks],
          completedCount,
          totalCount,
          isEnded: true
      };

      // Check if already in history to avoid duplicates
      const exists = history.find(h => h.date === dateKey);
      if (!exists) {
        setHistory(prev => [newLog, ...prev]);
      } else {
        // Update existing log
        setHistory(prev => prev.map(h => h.date === dateKey ? newLog : h));
      }

      setShowEndDayOptions(false);
      setView(AppView.HOME); // Go back to home after closing
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setView(AppView.ACTIVE_DAY);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Task Operations
  const addOrUpdateTask = () => {
    if (!taskInput.trim()) return;

    if (editingTask) {
      const updatedTasks = currentTasks.map(t => t.id === editingTask.id ? {
        ...t,
        text: taskInput,
        styles: inputStyle
      } : t);
      
      setTasksMap(prev => ({ ...prev, [dateKey]: updatedTasks }));
      setEditingTask(null);
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        text: taskInput,
        completed: false,
        styles: { ...inputStyle },
        createdAt: Date.now()
      };
      
      setTasksMap(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newTask]
      }));
    }
    setTaskInput('');
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setTaskInput(task.text);
    setInputStyle(task.styles);
  };

  const deleteTask = (id: string) => {
    setTasksMap(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].filter(t => t.id !== id)
    }));
    if (editingTask?.id === id) {
        setEditingTask(null);
        setTaskInput('');
    }
  };

  const toggleTask = (id: string) => {
    setTasksMap(prev => ({
        ...prev,
        [dateKey]: prev[dateKey].map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  // Reminder Operations
  const addReminder = () => {
      if (!reminderInput.trim()) return;
      const newReminder: Reminder = {
          id: crypto.randomUUID(),
          text: reminderInput,
          date: reminderDate,
          completed: false
      };
      setReminders(prev => [...prev, newReminder]);
      setReminderInput('');
      setShowReminderModal(false);
  };

  const toggleReminder = (id: string) => {
      setReminders(prev => prev.map(r => r.id === id ? {...r, completed: !r.completed} : r));
  };

  const deleteReminder = (id: string) => {
      setReminders(prev => prev.filter(r => r.id !== id));
  };

  // Views
  const renderHome = () => (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in space-y-8">
      <div className="text-center space-y-4">
        <h2 className={`text-4xl font-bold italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Ready to Conquer?
        </h2>
        <p className="text-gray-400">Initialize your daily sequence.</p>
      </div>
      <button 
        onClick={handleStartDay}
        className="group relative px-8 py-4 bg-pink-600 rounded-2xl overflow-hidden transition-all hover:scale-105 shadow-xl shadow-pink-500/30"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <span className="relative text-xl font-bold text-white uppercase tracking-wider">Start Day</span>
      </button>
    </div>
  );

  const renderActiveDay = () => (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end border-b border-pink-500/20 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-bold italic text-pink-500">
             {isToday(currentDate) ? "Your Day" : "Plan Ahead"}
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{format(currentDate, 'EEEE, MMMM do, yyyy')}</p>
        </div>
        {isToday(currentDate) && (
            <button 
            onClick={handleEndDayClick}
            className="self-start md:self-auto px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors border border-pink-500/30"
            >
            End Day
            </button>
        )}
      </header>

      {/* Input Area */}
      <div className={`p-4 rounded-2xl mb-8 border transition-all ${isDarkMode ? 'bg-slate-800/50 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addOrUpdateTask()}
          placeholder="Add Task ..."
          className={`w-full bg-transparent text-xl mb-4 focus:outline-none placeholder:text-gray-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          style={{
            fontWeight: inputStyle.bold ? 'bold' : 'normal',
            fontStyle: inputStyle.italic ? 'italic' : 'normal',
            textDecoration: inputStyle.underline ? 'underline' : 'none',
            color: inputStyle.textColor,
          }}
        />
        
        {/* Formatting Toolbar */}
        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-gray-500/20 pt-3">
          <div className="flex gap-2">
            <button 
              onClick={() => setInputStyle(p => ({...p, bold: !p.bold}))}
              className={`p-2 rounded-lg transition-colors ${inputStyle.bold ? 'bg-pink-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Bold size={16} />
            </button>
            <button 
              onClick={() => setInputStyle(p => ({...p, italic: !p.italic}))}
              className={`p-2 rounded-lg transition-colors ${inputStyle.italic ? 'bg-pink-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Italic size={16} />
            </button>
            <button 
              onClick={() => setInputStyle(p => ({...p, underline: !p.underline}))}
              className={`p-2 rounded-lg transition-colors ${inputStyle.underline ? 'bg-pink-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Underline size={16} />
            </button>
            
            <div className="w-px h-6 bg-gray-500/30 mx-2"></div>

            <div className="relative">
              <button 
                onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')}
                className="flex items-center gap-1 p-2 rounded-lg text-gray-400 hover:bg-white/5"
              >
                <Type size={16} />
                <div className="w-4 h-4 rounded-full border border-gray-500" style={{backgroundColor: inputStyle.textColor}}></div>
              </button>
              {showColorPicker === 'text' && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-pink-500/30 rounded-xl shadow-xl flex gap-1 z-10">
                  {TEXT_COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => { setInputStyle(p => ({...p, textColor: c})); setShowColorPicker(null); }}
                      className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
                      style={{backgroundColor: c}}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowColorPicker(showColorPicker === 'bg' ? null : 'bg')}
                className="flex items-center gap-1 p-2 rounded-lg text-gray-400 hover:bg-white/5"
              >
                <Palette size={16} />
                <div className="w-4 h-4 rounded-full border border-gray-500" style={{backgroundColor: inputStyle.bgColor}}></div>
              </button>
              {showColorPicker === 'bg' && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-pink-500/30 rounded-xl shadow-xl flex gap-1 z-10">
                  {BG_COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => { setInputStyle(p => ({...p, bgColor: c})); setShowColorPicker(null); }}
                      className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
                      style={{backgroundColor: c === 'transparent' ? '#333' : c}} // Show transparent as gray
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={addOrUpdateTask}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-medium transition-colors"
          >
            {editingTask ? 'Update' : 'Add'} <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
        {currentTasks.length === 0 ? (
          <div className="text-center mt-12 text-gray-500 italic">No tasks for this day. Start planning!</div>
        ) : (
          currentTasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={toggleTask} 
              onDelete={deleteTask}
              onEdit={editTask}
            />
          ))
        )}
      </div>
    </div>
  );

  const renderSummary = (tasksToSummarize: Task[] = currentTasks, dateToSummarize: string = dateKey, isHistoryView = false) => {
    const completed = tasksToSummarize.filter(t => t.completed).length;
    const total = tasksToSummarize.length;
    const pending = total - completed;
    const data = [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending },
    ];
    const COLORS = ['#22c55e', '#ef4444'];
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in max-w-4xl mx-auto w-full">
        <h2 className="text-4xl font-bold italic text-white mb-2">Day Summary</h2>
        <p className="text-gray-400 mb-8">{format(parseISO(dateToSummarize), 'MMMM do, yyyy')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Stats Card */}
          <div className="bg-slate-800/50 p-6 rounded-3xl border border-pink-500/20 backdrop-blur-sm relative">
            <h3 className="text-xl font-semibold text-pink-500 mb-4 flex items-center gap-2">
              <BarChart3 /> Statistics
            </h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#ec4899', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              {/* Percentage in Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-white">{percentage}%</span>
              </div>
            </div>
            <div className="flex justify-around mt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">{completed}</div>
                <div className="text-xs text-gray-400 uppercase">Done</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">{pending}</div>
                <div className="text-xs text-gray-400 uppercase">Pending</div>
              </div>
            </div>
          </div>

          {/* Details & Tip Card */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-800/50 p-6 rounded-3xl border border-pink-500/20 backdrop-blur-sm flex-1">
              <h3 className="text-xl font-semibold text-blue-400 mb-4">Pro Tip</h3>
              <p className="text-gray-200 italic text-lg leading-relaxed">"{dailyTip}"</p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-3xl border border-pink-500/20 backdrop-blur-sm flex-1 overflow-y-auto max-h-64 custom-scrollbar">
              <h3 className="text-xl font-semibold text-white mb-4">Task Breakdown</h3>
              <ul className="space-y-2">
                {tasksToSummarize.map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-sm text-gray-300">
                     <div className={`w-2 h-2 rounded-full ${t.completed ? 'bg-green-500' : 'bg-red-500'}`} />
                     <span className={t.completed ? 'line-through opacity-60' : ''}>{t.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* Show Close Day button only if we are in Summary View (active day), NOT in History View */}
            {!isHistoryView && (
                <button 
                onClick={closeDay}
                className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-pink-500/25 flex-1 md:flex-none text-center"
                >
                Close Day
                </button>
            )}

            <button 
                onClick={() => setView(AppView.HOME)}
                className={`px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-2xl text-white font-bold transition-colors flex-1 md:flex-none text-center ${!isHistoryView ? 'md:w-auto' : 'w-full md:w-auto'}`}
            >
                {isHistoryView ? "Back to Home" : "Resume Day"}
            </button>
        </div>
      </div>
    );
  };

  const renderReminders = () => {
    // Sort reminders by date
    const sortedReminders = [...reminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="h-full flex flex-col max-w-3xl mx-auto w-full animate-fade-in">
             <header className="mb-8 flex items-center justify-between border-b border-pink-500/20 pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView(AppView.HOME)} className="p-2 hover:bg-white/10 rounded-full">
                        <ArrowLeft className="text-white" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold italic text-yellow-400">Reminders</h2>
                        <p className="text-gray-400">Don't forget the important stuff.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowReminderModal(true)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                    <Plus size={18} /> New Reminder
                </button>
             </header>

             {showReminderModal && (
                 <div className="mb-8 p-4 bg-slate-800/80 border border-yellow-500/30 rounded-2xl animate-fade-in">
                     <h3 className="text-white font-semibold mb-3">Set New Reminder</h3>
                     <div className="flex flex-col md:flex-row gap-4">
                         <input 
                            type="text" 
                            placeholder="Reminder details..." 
                            className="flex-1 bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-yellow-400"
                            value={reminderInput}
                            onChange={(e) => setReminderInput(e.target.value)}
                         />
                         <input 
                            type="date"
                            className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-yellow-400"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                         />
                         <div className="flex gap-2">
                             <button onClick={addReminder} className="px-4 py-2 bg-yellow-500 text-slate-900 font-bold rounded-xl">Add</button>
                             <button onClick={() => setShowReminderModal(false)} className="px-4 py-2 bg-slate-700 text-white rounded-xl">Cancel</button>
                         </div>
                     </div>
                 </div>
             )}

             <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pb-10">
                 {sortedReminders.length === 0 ? (
                     <div className="text-center text-gray-500 mt-10">No reminders set. Relax!</div>
                 ) : (
                     sortedReminders.map(r => (
                         <div key={r.id} className="flex items-center gap-4 p-4 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-800/60 transition-colors">
                             <button onClick={() => toggleReminder(r.id)} className={`${r.completed ? 'text-green-500' : 'text-yellow-400'}`}>
                                 {r.completed ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                             </button>
                             <div className="flex-1">
                                 <div className={`text-lg text-white ${r.completed ? 'line-through opacity-50' : ''}`}>{r.text}</div>
                                 <div className="text-sm text-gray-400 flex items-center gap-1">
                                     <CalendarIcon size={12} /> {format(parseISO(r.date), 'MMMM do, yyyy')}
                                 </div>
                             </div>
                             <button onClick={() => deleteReminder(r.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                                 <Trash2 size={18} />
                             </button>
                         </div>
                     ))
                 )}
             </div>
        </div>
    );
  };

  const renderHistoryDetail = () => {
    if (!selectedHistoryLog) return null;
    return (
        <div className="h-full flex flex-col w-full animate-fade-in relative">
            <button 
                onClick={() => setView(AppView.HOME)} 
                className="absolute top-0 left-0 p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 z-10"
            >
                <ArrowLeft size={20} />
            </button>
            {renderSummary(selectedHistoryLog.tasks, selectedHistoryLog.date, true)}
        </div>
    )
  }

  // --- Main Layout Render ---
  if (view === AppView.SPLASH) return <SplashScreen />;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen w-screen overflow-hidden flex transition-colors duration-500`}>
      {/* End Day Options Modal */}
      {showEndDayOptions && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 border border-pink-500/50 rounded-2xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
                  <h3 className="text-2xl font-bold text-white italic">End Day?</h3>
                  <p className="text-gray-400">Choose how you want to proceed.</p>
                  
                  <button 
                    onClick={() => { setShowEndDayOptions(false); setView(AppView.SUMMARY); }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors border border-white/10"
                  >
                      Show Summary
                  </button>
                  
                  <button 
                    onClick={closeDay}
                    className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-pink-500/25"
                  >
                      Close Day
                  </button>
                  
                  <button 
                    onClick={() => setShowEndDayOptions(false)}
                    className="text-gray-500 hover:text-white text-sm"
                  >
                      Cancel
                  </button>
              </div>
          </div>
      )}

      {/* Container */}
      <div className="flex w-full h-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative">
        
        {/* Sidebar */}
        <aside 
          className={`
            fixed md:relative z-40 h-full bg-slate-900 border-r border-pink-500/20 shadow-2xl transition-all duration-300 flex flex-col
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'}
          `}
        >
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
             <div className="flex items-center gap-2 mb-8 cursor-pointer shrink-0" onClick={() => setView(AppView.HOME)}>
               <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-white" />
               </div>
               <h1 className="text-2xl font-black italic text-white">Tasker</h1>
             </div>

             <nav className="space-y-2 mb-8 shrink-0">
                 <button 
                    onClick={() => { setView(AppView.REMINDERS); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between group ${view === AppView.REMINDERS ? 'bg-pink-600/20 text-pink-500' : 'hover:bg-white/5 text-gray-300'}`}
                 >
                    <span className="flex items-center gap-2 font-medium">
                        <Bell size={18} /> Reminders
                    </span>
                    {reminders.filter(r => !r.completed).length > 0 && (
                        <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
                            {reminders.filter(r => !r.completed).length}
                        </span>
                    )}
                 </button>
             </nav>
             
             {/* Task History Section */}
             <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                     <History size={12} /> Task History
                 </div>
                 <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1 pr-1">
                     {history.length === 0 ? (
                         <div className="text-xs text-gray-600 italic p-2">No closed days yet.</div>
                     ) : (
                         history.map(log => (
                             <button
                                key={log.id}
                                onClick={() => {
                                    setSelectedHistoryLog(log);
                                    setView(AppView.HISTORY_VIEW);
                                    if(window.innerWidth < 768) setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group ${selectedHistoryLog?.id === log.id && view === AppView.HISTORY_VIEW ? 'bg-white/10' : ''}`}
                             >
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="text-sm text-gray-300 font-medium">{format(parseISO(log.date), 'MMM dd')}</span>
                                     <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.completedCount === log.totalCount && log.totalCount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-gray-400'}`}>
                                         {log.totalCount > 0 ? Math.round((log.completedCount/log.totalCount)*100) : 0}%
                                     </span>
                                 </div>
                                 <div className="text-xs text-gray-500 truncate">
                                     {log.completedCount}/{log.totalCount} completed
                                 </div>
                             </button>
                         ))
                     )}
                 </div>
             </div>
          </div>

          <CalendarWidget 
            currentDate={currentDate} 
            onDateSelect={handleDateSelect}
            isExpanded={isCalendarExpanded}
            toggleExpand={() => setIsCalendarExpanded(!isCalendarExpanded)}
            reminderDates={reminders.filter(r => !r.completed).map(r => r.date)}
            taskDates={Object.keys(tasksMap)}
          />
        </aside>

        {/* Main Content */}
        {/* ADDED PT-20 to avoid overlap with absolute positioned menu/theme buttons */}
        <main className="flex-1 flex flex-col relative h-full overflow-hidden pt-20">
            {/* Top Bar for Mobile/Theme Toggle */}
            <div className="absolute top-0 right-0 p-4 z-30 flex gap-4 pointer-events-none">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="pointer-events-auto p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-800 dark:text-white hover:scale-110 transition-transform shadow-lg border border-white/10"
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
            
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`absolute top-4 left-4 z-30 p-2 bg-slate-800 rounded-lg text-white md:hidden hover:bg-slate-700 transition-colors ${isSidebarOpen ? 'hidden' : 'block'}`}
            >
                <Menu size={20} />
            </button>
            
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <div className="flex-1 px-6 pb-6 md:p-10 overflow-y-auto custom-scrollbar relative z-0">
                {/* Background Shapes */}
                <div className="fixed top-20 right-20 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                <div className="fixed bottom-20 left-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                {view === AppView.HOME && renderHome()}
                {view === AppView.ACTIVE_DAY && renderActiveDay()}
                {view === AppView.SUMMARY && renderSummary(currentTasks, dateKey, false)}
                {view === AppView.REMINDERS && renderReminders()}
                {view === AppView.HISTORY_VIEW && renderHistoryDetail()}
            </div>
        </main>

        {/* AI Agent Overlay */}
        <AiAssistant currentTasks={currentTasks} />

      </div>
    </div>
  );
};

// --- Entry Point ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;