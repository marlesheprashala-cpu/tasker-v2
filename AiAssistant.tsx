import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Trash2, Maximize2, Minimize2, Plus, Edit2, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { getAiAssistance } from '../services/geminiService';
import { Task, ChatSession, ChatMessage } from '../types';

interface AiAssistantProps {
  currentTasks: Task[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ currentTasks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  
  // Constants
  const RETENTION_DAYS = 20;

  // Lazy Init Data
  const [userName, setUserName] = useState<string>(() => {
     try {
         return localStorage.getItem('tasker_user_name') || '';
     } catch { return ''; }
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
      try {
        const savedSessions = localStorage.getItem('tasker_ai_sessions');
        let parsedSessions: ChatSession[] = savedSessions ? JSON.parse(savedSessions) : [];
        
        // Cleanup old sessions
        const now = Date.now();
        const retentionMs = 20 * 24 * 60 * 60 * 1000;
        const validSessions = parsedSessions.filter(session => {
            const age = now - session.createdAt;
            return age < retentionMs;
        });
        return validSessions;
      } catch (e) {
          console.error("Error loading chat sessions", e);
          return [];
      }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Edit State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [showDeleteNotice, setShowDeleteNotice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);
  
  // Ref to track which sessions have shown the notice to prevent repeats
  const shownNoticeSessionIds = useRef<Set<string>>(new Set());

  // Initialize Session on Mount if needed
  useEffect(() => {
    isMounted.current = true;
    if (sessions.length === 0) {
        createNewSession();
    } else if (!currentSessionId) {
        // Select most recent
        const mostRecent = [...sessions].sort((a, b) => b.lastUpdated - a.lastUpdated)[0];
        setCurrentSessionId(mostRecent.id);
    }
  }, []); // Run once on mount

  // Persist Sessions
  useEffect(() => {
    if (isMounted.current) {
        localStorage.setItem('tasker_ai_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Persist Name
  useEffect(() => {
      if (isMounted.current) {
        localStorage.setItem('tasker_user_name', userName);
      }
  }, [userName]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, currentSessionId, isOpen, isExpanded]);

  // Smart Notice Logic: Show only if active, and if this specific session hasn't triggered it yet
  useEffect(() => {
      if (isOpen && currentSessionId && !shownNoticeSessionIds.current.has(currentSessionId)) {
          // Check if it's a "fresh" session (created within last minute) to show notice
          // Or if it is the very first time interaction
          const session = sessions.find(s => s.id === currentSessionId);
          if (session) {
             setShowDeleteNotice(true);
             const timer = setTimeout(() => setShowDeleteNotice(false), 6000);
             shownNoticeSessionIds.current.add(currentSessionId);
             return () => clearTimeout(timer);
          }
      }
  }, [isOpen, currentSessionId, sessions]);

  const createNewSession = (currentList = sessions) => {
      const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: 'New Chat',
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          messages: [{
              id: crypto.randomUUID(),
              role: 'ai',
              text: `Hi ${userName ? userName : 'there'}! I'm Tasker AI. How can I help you plan your day?`,
              timestamp: Date.now()
          }]
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      const updated = sessions.filter(s => s.id !== sessionId);
      setSessions(updated);
      if (currentSessionId === sessionId) {
          if (updated.length > 0) setCurrentSessionId(updated[0].id);
          else createNewSession(updated);
      }
  };
  
  const deleteCurrentSession = () => {
      if (currentSessionId) {
          const updated = sessions.filter(s => s.id !== currentSessionId);
          setSessions(updated);
          if (updated.length > 0) setCurrentSessionId(updated[0].id);
          else createNewSession(updated);
      }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    // Name Extraction Check (Lite)
    const nameMatch = userText.match(/(?:my name is|i am|call me) ([a-zA-Z]+)/i);
    if (nameMatch && nameMatch[1]) {
        setUserName(nameMatch[1]);
    }

    // Add User Message
    const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: userText,
        timestamp: Date.now()
    };

    updateSessionMessages(currentSessionId, userMsg);

    // Generate AI Response
    const currentSession = sessions.find(s => s.id === currentSessionId);
    const history = currentSession ? [...currentSession.messages, userMsg] : [userMsg];

    const responseText = await getAiAssistance(userText, currentTasks, history, userName);

    const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        text: responseText,
        timestamp: Date.now()
    };

    updateSessionMessages(currentSessionId, aiMsg, true); // Update title if first message
    setIsLoading(false);
  };

  const updateSessionMessages = (sessionId: string, newMessage: ChatMessage, updateTitle = false) => {
      setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              const updatedMsgs = [...s.messages, newMessage];
              let title = s.title;
              // Update title based on first user message if it's "New Chat"
              if (updateTitle && s.title === 'New Chat' && updatedMsgs.length > 1) {
                  const firstUserMsg = updatedMsgs.find(m => m.role === 'user');
                  if (firstUserMsg) {
                    title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
                  }
              }
              return {
                  ...s,
                  messages: updatedMsgs,
                  lastUpdated: Date.now(),
                  title
              };
          }
          return s;
      }));
  };

  const handleEditMessage = (msg: ChatMessage) => {
      setEditingMsgId(msg.id);
      setEditInput(msg.text);
  };

  const saveEditedMessage = (sessionId: string) => {
      if (!editingMsgId || !editInput.trim()) return;
      
      setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              return {
                  ...s,
                  messages: s.messages.map(m => m.id === editingMsgId ? { ...m, text: editInput } : m)
              }
          }
          return s;
      }));
      setEditingMsgId(null);
      setEditInput('');
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Close handler to ensure state resets smoothly
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setIsExpanded(false), 300);
  };

  // Render
  return (
    <div className={`fixed z-[50] transition-all duration-300 ease-in-out ${isExpanded ? 'inset-0 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm' : 'bottom-6 right-6 w-auto h-auto'}`}>
      
      {isOpen && (
        <div className={`
            bg-slate-900 border border-pink-500/30 shadow-2xl overflow-hidden flex flex-col relative
            ${isExpanded ? 'w-full h-full md:max-w-6xl md:rounded-2xl flex-row animate-scale-in' : 'w-80 md:w-96 h-[500px] rounded-2xl mb-4 animate-fade-in-up'}
        `}>
          
          {/* Notification Toast */}
          {showDeleteNotice && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg z-20 animate-fade-in-down pointer-events-none whitespace-nowrap">
                  Chat data automatically deleted after 20 days
              </div>
          )}

          {/* Sidebar (Visible when expanded on Desktop, or as overlay on Mobile when expanded) */}
          {isExpanded && (
              <div className="hidden md:flex w-64 bg-slate-950 border-r border-white/10 flex-col shrink-0">
                  <div className="p-4 border-b border-white/10">
                      <button 
                        onClick={() => createNewSession()}
                        className="w-full flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl transition-colors font-medium"
                      >
                          <Plus size={18} /> New Chat
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {sessions.map(session => (
                          <div 
                            key={session.id}
                            onClick={() => setCurrentSessionId(session.id)}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                          >
                              <div className="flex flex-col overflow-hidden">
                                  <span className="truncate text-sm font-medium">{session.title}</span>
                                  <span className="text-[10px] opacity-60">{format(session.lastUpdated, 'MMM dd')}</span>
                              </div>
                              <button 
                                onClick={(e) => deleteSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                              >
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-slate-900/50 relative min-w-0">
            
            {/* Header */}
            <div className="bg-pink-600 p-3 flex justify-between items-center shrink-0 shadow-md z-10">
                <div className="flex items-center gap-2 text-white font-bold italic min-w-0">
                    <Bot size={20} className="shrink-0" />
                    <span className="hidden sm:inline shrink-0">Tasker AI</span>
                    {!isExpanded && currentSession && (
                        <span className="text-xs font-normal opacity-80 border-l border-white/30 pl-2 truncate max-w-[100px]">
                            {currentSession.title}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Active Chat Actions */}
                    <button 
                        onClick={deleteCurrentSession}
                        className="text-white/80 hover:text-white p-1.5" 
                        title="Delete current chat"
                    >
                        <Trash2 size={18} />
                    </button>

                    {/* Mobile: Show History Toggle if not expanded */}
                    {!isExpanded && (
                        <button onClick={() => setIsExpanded(true)} className="text-white/80 hover:text-white p-1.5" title="View History">
                            <Clock size={18} />
                        </button>
                    )}

                    {!isExpanded && (
                         <button onClick={() => createNewSession()} className="text-white/80 hover:text-white p-1.5" title="New Chat">
                             <Plus size={18} />
                         </button>
                    )}

                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-white/80 hover:text-white p-1.5 hidden sm:block">
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    
                    {/* Mobile Expand Toggle - Icon Changes based on state */}
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-white/80 hover:text-white p-1.5 sm:hidden">
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    
                    <button onClick={handleClose} className="text-white/80 hover:text-white p-1.5">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Mobile History Drawer (Only when Expanded on Mobile) */}
            {isExpanded && (
                <div className="md:hidden absolute left-0 top-12 bottom-0 w-16 hover:w-64 transition-all duration-300 z-20 bg-slate-950/95 border-r border-white/10 overflow-hidden flex flex-col group backdrop-blur-md shadow-xl">
                     <div className="p-2 border-b border-white/10">
                        <button onClick={() => createNewSession()} className="p-2 bg-pink-600 rounded-lg text-white w-full flex justify-center hover:bg-pink-500">
                            <Plus size={20} />
                        </button>
                     </div>
                     <div className="flex-1 overflow-y-auto hidden group-hover:block p-2">
                        <div className="text-xs text-gray-500 font-bold uppercase mb-2">History</div>
                        {sessions.map(s => (
                             <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`p-3 text-sm truncate border-b border-white/5 cursor-pointer hover:bg-white/5 rounded ${currentSessionId === s.id ? 'text-pink-400 bg-white/5' : 'text-white/70'}`}>
                                 {s.title}
                             </div>
                        ))}
                     </div>
                     {/* Icon-only fallback for collapsed drawer */}
                     <div className="group-hover:hidden flex flex-col items-center pt-4 gap-4 opacity-50">
                         <Clock size={20} className="text-white" />
                         <div className="text-[10px] text-white rotate-90 whitespace-nowrap mt-8">HISTORY</div>
                     </div>
                </div>
            )}
            
            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isExpanded ? 'md:ml-0 ml-16 md:ml-0' : ''}`} ref={scrollRef}>
                {currentSession?.messages.map((msg) => (
                <div key={msg.id} className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                        ? 'bg-pink-500/20 border border-pink-500/50 text-white rounded-tr-none' 
                        : 'bg-slate-800 border border-slate-700 text-gray-200 rounded-tl-none'
                    }`}>
                        {editingMsgId === msg.id ? (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                <textarea 
                                    value={editInput}
                                    onChange={(e) => setEditInput(e.target.value)}
                                    className="bg-black/20 text-white p-2 rounded text-sm focus:outline-none w-full border border-white/10"
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingMsgId(null)} className="p-1 hover:text-red-400"><X size={14}/></button>
                                    <button onClick={() => saveEditedMessage(currentSession.id)} className="p-1 hover:text-green-400"><Check size={14}/></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                {msg.role === 'user' && (
                                    <div className="flex gap-2 absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded-lg px-2 py-1 z-10 shadow-lg border border-white/10">
                                        <button 
                                            onClick={() => handleEditMessage(msg)}
                                            className="text-gray-400 hover:text-blue-400"
                                            title="Edit"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                ))}
                {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm">
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
                )}
            </div>

            {/* Input */}
            <div className={`p-3 border-t border-white/10 bg-slate-900 flex gap-2 shrink-0 ${isExpanded ? 'md:ml-0 ml-16 md:ml-0' : ''}`}>
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={userName ? `Ask for help, ${userName}..` : "Ask for help .."}
                className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 placeholder-gray-500"
                />
                <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
                >
                <Send size={18} />
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      {!isExpanded && (
        <div className="relative group">
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                Tasker AI
            </div>
            
            <button
                onClick={() => { setIsOpen(true); setHasNotification(false); }}
                className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full shadow-lg shadow-pink-500/40 hover:scale-105 transition-transform"
            >
                {hasNotification && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full border-2 border-slate-900 animate-pulse z-10"></span>
                )}
                <Sparkles className={`text-white absolute ${hasNotification ? 'animate-spin' : 'animate-pulse'}`} size={24} />
            </button>
        </div>
      )}
    </div>
  );
};