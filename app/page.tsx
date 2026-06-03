'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  Camera,
  CheckCircle2,
  Clock3,
  Flame,
  History,
  ImagePlus,
  LogIn,
  Menu,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
  Sun,
  Moon,
  Trash2,
  User,
  Image as ImageIcon,
  FileText,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

type View = 'landing' | 'dashboard' | 'chat';

type ChatMessage = {
  id: string;
  role: 'student' | 'tutor';
  content: string;
  meta?: string;
};

type Session = {
  id: string;
  title: string;
  state: 'Act 1: Diagnosis' | 'Act 2: Fragment Repair' | 'Act 3: Reconstruction' | 'Completed';
  messages: ChatMessage[];
  topic: string;
  date: string;
  hasImage?: boolean;
};

type Attachment = {
  name: string;
  kind: 'camera' | 'upload';
  dataUrl?: string;
};

const suggestedPrompts = [
  'I am stuck on rotational kinematics torque equations.',
  'Help me set up the integral for a non-uniform charged disk.',
  'I keep getting the wrong friction force direction in circular motion.',
];

const learningNotes = [
  {
    title: 'Act 1: Concept Diagnosis',
    detail: 'Asks 2–4 sharp questions targeting the exact step where your solution fails.',
    color: 'border-emerald-500/20 bg-emerald-500/5'
  },
  {
    title: 'Act 2: Fragment Repair',
    detail: 'Generates a 2-minute micro-example targeting your gap and waits for you to solve it.',
    color: 'border-amber-500/20 bg-amber-500/5'
  },
  {
    title: 'Act 3: Socratic Reconstruction',
    detail: 'Rebuilds the original problem step-by-step with tutor scaffolding—asking, never telling.',
    color: 'border-cyan-500/20 bg-cyan-500/5'
  }
];

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; provider: 'google' | 'guest' } | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dynamic session list state
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 'session-1',
      title: 'Rotational torque of cylinder',
      state: 'Act 1: Diagnosis',
      topic: 'Mechanics',
      date: 'Today',
      hasImage: true,
      messages: [
        {
          id: 'm1',
          role: 'tutor',
          content: 'Here is a diagram from HC Verma. Let us check the moment of inertia about the moving cylinder axis. Why did you choose point A?',
          meta: '10:30 AM'
        },
        {
          id: 'm2',
          role: 'student',
          content: 'Because point A is the instantaneous center of zero velocity.',
          meta: '10:32 AM'
        }
      ]
    },
    {
      id: 'session-2',
      title: 'Definite integration bounds',
      state: 'Act 3: Reconstruction',
      topic: 'Calculus',
      date: 'Yesterday',
      messages: [
        {
          id: 'n1',
          role: 'tutor',
          content: 'If the charge density is non-uniform, what is the integration element $dq$?',
          meta: '3:15 PM'
        },
        {
          id: 'n2',
          role: 'student',
          content: 'It should be $dq = \\sigma(r) \\cdot 2\\pi r dr$.',
          meta: '3:16 PM'
        }
      ]
    },
    {
      id: 'session-3',
      title: 'Organic ether nomenclature rules',
      state: 'Completed',
      topic: 'Chemistry',
      date: '2 days ago',
      messages: [
        {
          id: 'c1',
          role: 'tutor',
          content: 'When naming an ether with an alkoxy group, which carbon chain is chosen as the parent alkane?',
          meta: '11:00 AM'
        },
        {
          id: 'c2',
          role: 'student',
          content: 'The parent alkane should be the longest continuous carbon chain.',
          meta: '11:02 AM'
        },
        {
          id: 'c3',
          role: 'tutor',
          content: 'Correct! The alkoxy group becomes a substituent. So how would you name $\\text{CH}_3-\\text{O}-\\text{CH}_2\\text{CH}_3$?',
          meta: '11:03 AM'
        },
        {
          id: 'c4',
          role: 'student',
          content: 'It is methoxyethane.',
          meta: '11:04 AM'
        }
      ]
    }
  ]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'math'>('all');

  const subjectStats = useMemo(() => {
    return {
      all: {
        resolved: sessions.filter(s => s.state === 'Completed').length,
        streak: '4 days',
        gaps: sessions.length,
        accuracy: 74,
        benchmarkText: 'You successfully identify torque, isomers, and integration bounds on the first attempt 74% of the time.',
        accuracyLabel: 'Combined accuracy index',
        knowledgeMap: [
          { topic: 'Mechanics (Rotational, Kinematics)', value: '76%', color: 'bg-emerald-500' },
          { topic: 'Electrostatics (Field flux, Capacitance)', value: '58%', color: 'bg-cyan-500' },
          { topic: 'Calculus (Definite integral bounds)', value: '40%', color: 'bg-amber-500' },
          { topic: 'Organic Chemistry (Nomenclature)', value: '12%', color: 'bg-rose-500' },
        ]
      },
      physics: {
        resolved: sessions.filter(s => s.state === 'Completed' && (s.topic === 'Mechanics' || s.topic === 'Electrostatics')).length,
        streak: '3 days',
        gaps: sessions.filter(s => s.topic === 'Mechanics' || s.topic === 'Electrostatics').length,
        accuracy: 82,
        benchmarkText: 'You successfully identify dynamic torque axis constraints on the first attempt 82% of the time.',
        accuracyLabel: 'Physics accuracy index',
        knowledgeMap: [
          { topic: 'Mechanics (Rotational Dynamics)', value: '76%', color: 'bg-emerald-500' },
          { topic: 'Electrostatics (Field flux, Capacitance)', value: '58%', color: 'bg-cyan-500' },
          { topic: 'Thermodynamics (Heat engines)', value: '35%', color: 'bg-amber-500' },
        ]
      },
      chemistry: {
        resolved: sessions.filter(s => s.state === 'Completed' && s.topic === 'Chemistry').length,
        streak: '1 day',
        gaps: sessions.filter(s => s.topic === 'Chemistry').length,
        accuracy: 55,
        benchmarkText: 'You successfully identify stereochemistry isomers on the first attempt 55% of the time.',
        accuracyLabel: 'Chemistry accuracy index',
        knowledgeMap: [
          { topic: 'Organic Chemistry (Nomenclature)', value: '42%', color: 'bg-rose-500' },
          { topic: 'Chemical Bonding (Hybridization)', value: '30%', color: 'bg-emerald-500' },
          { topic: 'Physical Chemistry (Kinetics)', value: '15%', color: 'bg-amber-500' },
        ]
      },
      math: {
        resolved: sessions.filter(s => s.state === 'Completed' && s.topic === 'Calculus').length,
        streak: '2 days',
        gaps: sessions.filter(s => s.topic === 'Calculus').length,
        accuracy: 68,
        benchmarkText: 'You successfully set up definite integration bounds on the first attempt 68% of the time.',
        accuracyLabel: 'Math accuracy index',
        knowledgeMap: [
          { topic: 'Calculus (Definite integral bounds)', value: '68%', color: 'bg-amber-500' },
          { topic: 'Coordinate Geometry (Conics)', value: '40%', color: 'bg-emerald-500' },
          { topic: 'Algebra (Complex Numbers)', value: '25%', color: 'bg-cyan-500' },
        ]
      }
    };
  }, [sessions]);

  const currentSubjectData = useMemo(() => {
    return subjectStats[activeSubject];
  }, [subjectStats, activeSubject]);

  const filteredSessions = useMemo(() => {
    if (activeSubject === 'all') return sessions;
    if (activeSubject === 'physics') return sessions.filter(s => s.topic === 'Mechanics' || s.topic === 'Electrostatics');
    if (activeSubject === 'chemistry') return sessions.filter(s => s.topic === 'Chemistry');
    return sessions.filter(s => s.topic === 'Calculus');
  }, [sessions, activeSubject]);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync theme setting
  useEffect(() => {
    const saved = localStorage.getItem('doubt-slayer-theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('doubt-slayer-theme', newTheme);
  };

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isComposing]);

  // Load selected session in chat
  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setView('chat');
    }
  };

  // Delete session from list
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSessions((current) => current.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  // Enter guest mode
  const handleContinueAsGuest = () => {
    setUser({ name: 'Guest Student', email: 'guest@doubt-slayer.in', provider: 'guest' });
    setView('dashboard');
  };

  // Sign in mock with loading animation
  const handleGoogleSignIn = () => {
    setIsSigningIn(true);
    setTimeout(() => {
      setIsSigningIn(false);
      setUser({ name: 'Rahul Sharma', email: 'rahul.sharma@jee.in', provider: 'google' });
      setView('dashboard');
    }, 1500);
  };

  // Sign out
  const handleSignOut = () => {
    setUser(null);
    setView('landing');
  };

  // File Upload Handlers
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, kind: Attachment['kind']) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachment({
        name: file.name,
        kind,
        dataUrl: e.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Start a completely new chat session
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setView('chat');
  };

  // Submit student response in chat
  const handleSendMessage = (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const trimmed = rawText.trim();
    if ((!trimmed && !attachment) || isComposing) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentMessageId = crypto.randomUUID();

    const newStudentMsg: ChatMessage = {
      id: studentMessageId,
      role: 'student',
      content: trimmed || (attachment ? `Uploaded a problem image: ${attachment.name}` : ''),
      meta: timestamp,
    };

    const updatedMessages = [...messages, newStudentMsg];
    setMessages(updatedMessages);
    setInput('');
    const hasImage = !!attachment;
    setAttachment(null);

    // Dynamic session management: update or create
    let activeId = currentSessionId;
    if (!activeId) {
      activeId = crypto.randomUUID();
      const topic = trimmed.toLowerCase().includes('integration') || trimmed.toLowerCase().includes('integral') ? 'Calculus' : 'Mechanics';
      const title = trimmed ? (trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed) : 'Image problem diagnosis';
      
      const newSession: Session = {
        id: activeId,
        title,
        state: 'Act 1: Diagnosis',
        topic,
        date: 'Today',
        hasImage,
        messages: [newStudentMsg],
      };

      setSessions((current) => [newSession, ...current]);
      setCurrentSessionId(activeId);
    } else {
      setSessions((current) =>
        current.map((s) => (s.id === activeId ? { ...s, messages: [...s.messages, newStudentMsg] } : s))
      );
    }

    // Trigger mock Socratic AI tutor responses
    setIsComposing(true);
    setTimeout(() => {
      const activeSession = sessions.find((s) => s.id === activeId);
      const isCalculus = activeSession?.topic === 'Calculus';

      let aiContent = '';
      if (trimmed.toLowerCase().includes('torque') || trimmed.toLowerCase().includes('axis')) {
        aiContent = 'Understood. Let us examine the rotational torque about the moving axis. In order to make the torque of tension vanish, about which point must we evaluate the torque? Let us think about the radius vector.';
      } else if (trimmed.toLowerCase().includes('integral') || trimmed.toLowerCase().includes('integration')) {
        aiContent = 'Excellent topic. Let us set up the integral first. If the charge density is given by $\\sigma(r) = \\sigma_0 (1 - r/R)$, what would be the charge element $dq$ for a thin concentric ring of radius $r$ and thickness $dr$?';
      } else if (trimmed.toLowerCase().includes('friction') || trimmed.toLowerCase().includes('circular')) {
        aiContent = 'Friction acts as the centripetal force here. To find the maximum safe speed, what is the maximum possible static friction force in terms of coefficient $\\mu$ and normal force $N$? Let us calculate that ratio first.';
      } else {
        aiContent = isCalculus
          ? 'Let us look at the boundary conditions first. If the limit approaches $x \\to 0$, which algebraic expansion must we apply to simplify the numerator?'
          : 'Let us isolate the concept being tested. Is this conservation of mechanical energy, linear momentum, or angular momentum? What conditions must hold for torque to be conserved?';
      }

      const newTutorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'tutor',
        content: aiContent,
        meta: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((current) => [...current, newTutorMsg]);
      setSessions((current) =>
        current.map((s) => (s.id === activeId ? { ...s, messages: [...s.messages, newTutorMsg] } : s))
      );
      setIsComposing(false);
    }, 1200);
  };

  const handleSuggestedPromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Get active session metadata
  const activeSessionMeta = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId);
  }, [sessions, currentSessionId]);

  // Compute mock stats
  const resolvedCount = useMemo(() => {
    return sessions.filter((s) => s.state === 'Completed').length;
  }, [sessions]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#090f0c]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1b8f6a] border-t-transparent" />
      </div>
    );
  }

  // Theme variable colors mapping
  const isDark = theme === 'dark';

  return (
    <main
      className={cn(
        'min-h-[100dvh] transition-colors duration-300 font-sans relative flex flex-col',
        isDark ? 'bg-[#090f0c] text-slate-100' : 'bg-[#f6f8f4] text-slate-800'
      )}
    >
      {/* Background Mesh Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={cn(
            'absolute top-[-10%] left-[5%] w-[80vw] h-[40vh] rounded-full blur-[130px] opacity-40 transition-colors duration-500',
            isDark ? 'bg-[#1b8f6a]/15' : 'bg-[#163f36]/5'
          )}
        />
        <div
          className={cn(
            'absolute bottom-[10%] right-[-5%] w-[60vw] h-[35vh] rounded-full blur-[120px] opacity-30 transition-colors duration-500',
            isDark ? 'bg-[#d06b38]/10' : 'bg-[#d06b38]/5'
          )}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: LANDING PAGE */}
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className={cn('relative z-10 flex flex-col min-h-screen', isDark ? 'grid-bg-dark' : 'grid-bg-light')}
          >
            <LandingHeader theme={theme} onToggleTheme={toggleTheme} />
            
            <div className="mx-auto grid max-w-7xl flex-1 grid-cols-1 items-center gap-12 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
              
              {/* Product Thesis Side */}
              <div className="flex flex-col space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    'inline-flex self-start items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase',
                    isDark ? 'border-emerald-500/20 bg-emerald-500/10 text-[#4ade80]' : 'border-[#163f36]/20 bg-[#163f36]/5 text-[#163f36]'
                  )}
                >
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  Socratic Physics & Math Diagnostics
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={cn(
                    'text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.05]',
                    isDark ? 'text-white' : 'text-[#11211b]'
                  )}
                >
                  Slay your <br />
                  <span className="bg-gradient-to-r from-[#1b8f6a] to-emerald-400 bg-clip-text text-transparent">
                    conceptual gaps.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn('text-base sm:text-lg max-w-xl leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}
                >
                  Doubt Slayer is not an answer engine. It isolates the exact conceptual fault line in your physics or math solutions and co-constructs the fix with you using micro-problems.
                </motion.p>

                {/* Workflow Cards */}
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3 mt-4">
                  {learningNotes.map((note, index) => (
                    <motion.div
                      key={note.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + index * 0.05 }}
                      className={cn(
                        'rounded-xl border p-4 shadow-sm flex flex-col justify-between transition hover:scale-[1.02] duration-300',
                        note.color,
                        isDark ? 'text-slate-200 border-white/5 bg-[#101a15]/60' : 'text-slate-800 border-slate-200/80 bg-white/80'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1b8f6a]/20 text-xs font-bold text-[#1b8f6a]">
                            {index + 1}
                          </span>
                          <h3 className="text-sm font-bold tracking-tight">{note.title}</h3>
                        </div>
                        <p className={cn('text-xs leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>
                          {note.detail}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Login Mocks Card & Interactive Preview */}
              <div className="flex flex-col space-y-4">
                {/* Visual Live Mock Preview */}
                <TutorPreview theme={theme} />

                {/* Auth Actions Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    'rounded-2xl border p-6 shadow-xl relative overflow-hidden backdrop-blur-md',
                    isDark ? 'border-white/5 bg-[#101a15]/90' : 'border-slate-200 bg-white/95'
                  )}
                >
                  <div className="mb-5 text-center sm:text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d06b38]">Welcome to Doubt Slayer</p>
                    <h2 className="text-xl font-bold tracking-tight mt-1">Access the AI Tutor Dashboard</h2>
                  </div>

                  <AnimatePresence mode="wait">
                    {isSigningIn ? (
                      <motion.div
                        key="loading-auth"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-6"
                      >
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1b8f6a] border-t-transparent mb-4" />
                        <p className="text-sm font-bold text-center">Verifying Google Identity...</p>
                        <p className="text-xs text-slate-400 mt-1">Connecting to Secure Firebase OTP...</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="buttons-auth"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className={cn(
                            'flex w-full min-h-12 items-center justify-center gap-3 rounded-xl border text-sm font-bold shadow-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]',
                            isDark
                              ? 'border-white/10 bg-[#16241e] text-white hover:bg-[#1f332a] hover:border-emerald-500/30'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-[#163f36]/30'
                          )}
                        >
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#EA4335"
                              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.528 0-6.39-2.862-6.39-6.39 0-3.528 2.862-6.39 6.39-6.39 1.58 0 3.013.578 4.12 1.528l3.053-3.053C19.262 2.378 15.935 1 12.24 1l-.043.003C5.815 1.05.7 6.165.7 12.585S5.815 24.12 12.2 24.12c5.968 0 11.233-4.28 11.233-11.22 0-.853-.086-1.688-.242-2.482H12.24z"
                            />
                          </svg>
                          Sign in with Google
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleContinueAsGuest}
                          className={cn(
                            'flex w-full min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]',
                            isDark
                              ? 'bg-[#1b8f6a] hover:bg-[#20ab7f] hover:shadow-emerald-500/10'
                              : 'bg-[#163f36] hover:bg-[#205b4e] hover:shadow-emerald-950/15'
                          )}
                        >
                          <Sparkles className="h-4 w-4" />
                          Continue as Guest
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-6 border-t border-dashed border-slate-700/10 pt-4 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-[#1b8f6a]" /> India standard phone login supported
                    </span>
                    <span>v1.2 (Beta)</span>
                  </div>
                </motion.div>
              </div>

            </div>
          </motion.div>
        )}

        {/* VIEW 2: DASHBOARD PAGE */}
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col z-10 max-w-7xl mx-auto w-full px-5 py-6 lg:px-8"
          >
            {/* Dashboard Header */}
            <header className="flex items-center justify-between pb-6 border-b border-slate-700/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b8f6a]/20 text-[#1b8f6a]">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black uppercase tracking-wider">Doubt Slayer</h1>
                  <p className="text-[10px] uppercase font-bold text-slate-400">JEE Workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={cn(
                    'p-2 rounded-lg border transition duration-300',
                    isDark ? 'border-white/5 hover:bg-white/5 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  )}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className={cn(
                  'flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-semibold',
                  isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
                )}>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[12ch]">{user?.name}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    'p-2 rounded-lg border transition duration-300 hover:text-rose-400',
                    isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                  )}
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Subject Filter Buttons Group */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Subjects' },
                { id: 'physics', label: 'Physics' },
                { id: 'chemistry', label: 'Chemistry' },
                { id: 'math', label: 'Mathematics' },
              ].map((sub) => {
                const count = sub.id === 'all' 
                  ? sessions.length 
                  : sub.id === 'physics' 
                  ? sessions.filter(s => s.topic === 'Mechanics' || s.topic === 'Electrostatics').length
                  : sub.id === 'chemistry'
                  ? sessions.filter(s => s.topic === 'Chemistry').length
                  : sessions.filter(s => s.topic === 'Calculus').length;

                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubject(sub.id as any)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border flex items-center gap-2 active:scale-95 cursor-pointer',
                      activeSubject === sub.id
                        ? isDark
                          ? 'bg-[#1b8f6a] border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                          : 'bg-[#163f36] border-[#163f36] text-white shadow-lg shadow-[#163f36]/15'
                        : isDark
                        ? 'border-white/5 bg-[#101a15] hover:bg-white/5 text-slate-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                    )}
                  >
                    <span>{sub.label}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-black',
                      activeSubject === sub.id
                        ? 'bg-white/20 text-white'
                        : isDark
                        ? 'bg-white/5 text-slate-500'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dashboard Main Banner */}
            <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <section className={cn(
                'rounded-2xl border p-6 flex flex-col justify-between shadow-sm relative overflow-hidden backdrop-blur',
                isDark ? 'border-white/5 bg-[#101a15]/80' : 'border-slate-200 bg-white/80'
              )}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#d06b38]">Welcome Back</p>
                  <h2 className="text-3xl font-extrabold mt-1 tracking-tight">Slay your competitive exam doubts</h2>
                  <p className={cn('text-sm mt-3 max-w-xl leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    Use our real-time diagnostic engine. Snap a picture of dynamic physics diagrams, math integrals, or organic chemistry reactions, and isolate your conceptual gaps in less than 3 minutes.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="mt-6 self-start inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-[#1b8f6a] hover:bg-[#20ab7f] text-white shadow-lg transition duration-300 active:scale-[0.98]"
                >
                  <MessageSquareText className="h-4 w-4" />
                  Launch AI Tutor Chat
                </button>
              </section>

              {/* Today Activity Circle */}
              <section className={cn(
                'rounded-2xl border p-6 flex flex-col justify-between shadow-sm relative overflow-hidden',
                isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
              )}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black tracking-wider uppercase text-slate-400">Current Progress</h3>
                    <p className="text-lg font-bold mt-1">Diagnostics accuracy index</p>
                  </div>
                  <Target className="h-5 w-5 text-[#d06b38]" />
                </div>
                
                <div className="flex items-center gap-5 mt-4">
                  <div className="relative flex items-center justify-center h-20 w-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" className="stroke-slate-800/10 fill-none" strokeWidth="6" />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-[#1b8f6a] fill-none"
                        strokeWidth="6"
                        strokeDasharray={213}
                        initial={{ strokeDashoffset: 213 }}
                        animate={{ strokeDashoffset: 213 * (1 - currentSubjectData.accuracy / 100) }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-base font-black">
                      {currentSubjectData.accuracy}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{currentSubjectData.accuracyLabel}</p>
                    <p className={cn('text-xs mt-1 leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {currentSubjectData.benchmarkText}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* User Stats placeholders */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
              {[
                { label: 'Doubts Resolved', value: currentSubjectData.resolved, detail: 'Calculated session goals completed', icon: CheckCircle2 },
                { label: 'Study Streak', value: currentSubjectData.streak, detail: 'Consistent student pace', icon: Flame },
                { label: 'Conceptual Gaps Found', value: currentSubjectData.gaps, detail: 'Dynamic taxonomy tags', icon: Brain },
                { label: 'Active Session Phase', value: activeSessionMeta && (activeSubject === 'all' || (activeSubject === 'physics' && (activeSessionMeta.topic === 'Mechanics' || activeSessionMeta.topic === 'Electrostatics')) || (activeSubject === 'chemistry' && activeSessionMeta.topic === 'Chemistry') || (activeSubject === 'math' && activeSessionMeta.topic === 'Calculus')) ? activeSessionMeta.state : 'None active', detail: 'Current act routing', icon: Target },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.section
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'rounded-xl border p-5 shadow-sm flex flex-col justify-between relative overflow-hidden',
                      isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1b8f6a]/10 text-[#1b8f6a] mb-4">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-black tracking-tight">{item.value}</p>
                      <h4 className="text-xs font-bold mt-1 text-slate-400 uppercase tracking-wider">{item.label}</h4>
                      <p className={cn('text-[11px] mt-1 leading-relaxed', isDark ? 'text-slate-500' : 'text-slate-400')}>
                        {item.detail}
                      </p>
                    </div>
                  </motion.section>
                );
              })}
            </div>

            {/* Knowledge Map & Recent Sessions */}
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] mt-6">
              
              {/* Knowledge Map progress bars */}
              <section className={cn(
                'rounded-2xl border p-6 shadow-sm',
                isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
              )}>
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black tracking-wider uppercase text-[#d06b38]">Taxonomy Tree</h3>
                    <p className="text-base font-bold mt-0.5">JEE Syllabus Mastery Map</p>
                  </div>
                  <Target className="h-4 w-4 text-[#1b8f6a]" />
                </div>

                <div className="space-y-4">
                  {currentSubjectData.knowledgeMap.map((item) => (
                    <div key={item.topic}>
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                        <span>{item.topic}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className={cn('h-2 overflow-hidden rounded-full', isDark ? 'bg-white/5' : 'bg-slate-100')}>
                        <motion.div
                          key={`${activeSubject}-${item.topic}`}
                          initial={{ width: 0 }}
                          animate={{ width: item.value }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn('h-full rounded-full', item.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Sessions widget */}
              <section className={cn(
                'rounded-2xl border p-6 shadow-sm flex flex-col',
                isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
              )}>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">Previous Doubts</h3>
                    <p className="text-base font-bold mt-0.5">Session Logs</p>
                  </div>
                  <History className="h-4 w-4 text-amber-500" />
                </div>

                {filteredSessions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <History className="h-8 w-8 text-slate-500 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-slate-400">No session history saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredSessions.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectSession(item.id)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-all duration-300 hover:scale-[1.01] cursor-pointer group',
                          isDark
                            ? 'border-white/5 bg-[#16241e] hover:bg-[#1e332a] hover:border-emerald-500/20'
                            : 'border-slate-200 bg-[#fbfcfa] hover:bg-[#f3f9f5] hover:border-[#163f36]/20'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn(
                            'h-2.5 w-2.5 shrink-0 rounded-full',
                            item.topic === 'Calculus' ? 'bg-amber-500' : item.topic === 'Chemistry' ? 'bg-rose-500' : 'bg-emerald-500'
                          )} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{item.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.state} • {item.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition duration-300" />
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, item.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                            title="Delete Log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: AI CHAT INTERFACE */}
        {view === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'flex-1 flex overflow-hidden z-10 border-t',
              isDark ? 'border-white/5 bg-[#090f0c]' : 'border-slate-200 bg-[#f6f8f4]'
            )}
          >
            {/* Desktop / Drawer Sidebar for Chat History */}
            <aside
              className={cn(
                'hidden lg:flex flex-col w-80 shrink-0 border-r transition-colors duration-300',
                isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
              )}
            >
              <ChatSidebar
                sessions={sessions}
                currentId={currentSessionId}
                theme={theme}
                onDashboard={() => setView('dashboard')}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
              />
            </aside>

            {/* Mobile Sidebar overlay backdrop */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <motion.aside
                    initial={{ x: -280 }}
                    animate={{ x: 0 }}
                    exit={{ x: -280 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={cn(
                      'h-full w-72 flex flex-col',
                      isDark ? 'bg-[#101a15]' : 'bg-white'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChatSidebar
                      sessions={sessions}
                      currentId={currentSessionId}
                      theme={theme}
                      onDashboard={() => {
                        setSidebarOpen(false);
                        setView('dashboard');
                      }}
                      onNewChat={() => {
                        setSidebarOpen(false);
                        handleNewChat();
                      }}
                      onSelectSession={(id) => {
                        setSidebarOpen(false);
                        handleSelectSession(id);
                      }}
                      onDeleteSession={handleDeleteSession}
                    />
                  </motion.aside>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Chat Workspace */}
            <section className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* Workspace Header */}
              <header className={cn(
                'h-16 shrink-0 border-b flex items-center justify-between px-4 z-10 transition-colors duration-300',
                isDark ? 'border-white/5 bg-[#101a15]/90' : 'border-slate-200 bg-white/90'
              )}>
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className={cn(
                      'p-2 rounded-lg lg:hidden transition',
                      isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                    )}
                    aria-label="Open sidebar"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('dashboard')}
                    className={cn(
                      'p-2 rounded-lg transition hidden lg:inline-flex',
                      isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                    )}
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <div className="min-w-0">
                    <h2 className="text-sm font-black uppercase tracking-wider truncate">
                      {activeSessionMeta ? activeSessionMeta.title : 'AI Diagnostic Tutor'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {activeSessionMeta ? activeSessionMeta.state : 'Ready to diagnose'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={cn(
                      'p-2 rounded-lg border transition duration-300',
                      isDark ? 'border-white/5 hover:bg-white/5 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    )}
                    aria-label="Toggle theme"
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition',
                        isDark
                          ? 'border-emerald-500/20 text-[#4ade80] bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-[#163f36]/20 text-[#163f36] bg-[#163f36]/5 hover:bg-[#163f36]/10'
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Session</span>
                    </button>
                  )}
                </div>
              </header>

              {/* Chat Message Bubble area */}
              <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar relative z-0">
                <div className="mx-auto max-w-3xl min-h-full flex flex-col">
                  <AnimatePresence mode="wait">
                    {messages.length === 0 ? (
                      /* Chat Empty State with animation */
                      <motion.div
                        key="empty-chat"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-12"
                      >
                        <div className="relative h-28 w-28 flex items-center justify-center mb-6">
                          {/* Animated SVG Rings */}
                          <div className={cn(
                            'absolute inset-0 rounded-full border border-dashed animate-spin duration-[40s]',
                            isDark ? 'border-emerald-500/10' : 'border-emerald-950/10'
                          )} />
                          <div className={cn(
                            'absolute inset-4 rounded-full border border-dotted animate-spin duration-[15s]',
                            isDark ? 'border-amber-500/10' : 'border-amber-950/10'
                          )} />
                          <div className={cn(
                            'absolute inset-2 bg-gradient-to-tr rounded-full animate-float flex items-center justify-center shadow-lg',
                            isDark ? 'from-[#101a15] to-[#16241e]' : 'from-[#edf4ef] to-white'
                          )}>
                            <Brain className="h-10 w-10 text-[#1b8f6a]" />
                          </div>
                        </div>

                        <h3 className="text-xl font-extrabold tracking-tight">Socrates Diagnostic Active</h3>
                        <p className={cn('text-xs mt-2 max-w-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-500')}>
                          Snap a photo of HC Verma, upload a diagram, or click a pre-set conceptual topic below to initiate diagnosis.
                        </p>

                        <div className="mt-8 grid gap-2.5 max-w-md w-full">
                          {suggestedPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => handleSuggestedPromptClick(prompt)}
                              className={cn(
                                'text-left p-3.5 rounded-xl border text-xs font-bold leading-normal transition-all duration-300 hover:scale-[1.01]',
                                isDark
                                  ? 'border-white/5 bg-[#101a15] hover:bg-[#16241e] hover:border-[#1b8f6a]/20 text-slate-200'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-[#163f36]/20 text-slate-700'
                              )}
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      /* Chat message list */
                      <motion.div
                        key="chat-messages"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4 pb-4"
                      >
                        {messages.map((message) => (
                          <MessageBubble key={message.id} message={message} theme={theme} />
                        ))}
                        {isComposing && <TypingIndicator theme={theme} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Auto-scroll anchor */}
                  <div ref={chatEndRef} className="h-4 shrink-0" />
                </div>
              </div>

              {/* Chat Input panel */}
              <footer className={cn(
                'shrink-0 border-t p-4 transition-colors duration-300',
                isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
              )}>
                <div className="mx-auto max-w-3xl">
                  
                  {/* Staged file attachment preview */}
                  <AnimatePresence>
                    {attachment && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={cn(
                          'mb-3 inline-flex items-center gap-3 p-2 rounded-xl border relative shadow-md',
                          isDark ? 'border-white/5 bg-[#16241e]' : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        {attachment.dataUrl ? (
                          <img
                            src={attachment.dataUrl}
                            className="h-14 w-14 object-cover rounded-lg border border-black/10 shrink-0"
                            alt="Staged attachment"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <FileText className="h-6 w-6 text-[#1b8f6a]" />
                          </div>
                        )}
                        <div className="min-w-0 pr-6">
                          <p className="text-xs font-bold truncate max-w-[150px]">{attachment.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize mt-0.5">{attachment.kind} Mode</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachment(null)}
                          className={cn(
                            'absolute top-[-8px] right-[-8px] h-6 w-6 rounded-full border flex items-center justify-center shadow-lg transition',
                            isDark ? 'bg-[#090f0c] border-white/10 hover:bg-white/5' : 'bg-white border-slate-200 hover:bg-slate-50'
                          )}
                          aria-label="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input container */}
                  <div className={cn(
                    'flex items-end gap-1.5 border rounded-2xl p-2 focus-within:ring-1 transition-all duration-300 shadow-inner',
                    isDark
                      ? 'border-white/5 bg-[#16241e] focus-within:border-emerald-500/50 focus-within:ring-emerald-500/20'
                      : 'border-slate-250 bg-slate-50/50 focus-within:border-[#163f36]/50 focus-within:ring-[#163f36]/15'
                  )}>
                    {/* Attachment buttons */}
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className={cn(
                        'h-10 w-10 shrink-0 flex items-center justify-center rounded-xl transition',
                        isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-white hover:text-[#163f36]'
                      )}
                      title="Attach File"
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className={cn(
                        'h-10 w-10 shrink-0 flex items-center justify-center rounded-xl transition',
                        isDark ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-white hover:text-[#163f36]'
                      )}
                      title="Camera Image"
                    >
                      <Camera className="h-5 w-5" />
                    </button>

                    {/* Hidden inputs */}
                    <input
                      ref={uploadInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'upload')}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, 'camera')}
                    />

                    {/* Text field */}
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Ask the Socratic tutor about your JEE doubt..."
                      className="flex-1 max-h-32 min-h-[40px] py-2 bg-transparent outline-none border-none text-sm resize-none leading-relaxed placeholder-slate-400"
                    />

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={(!input.trim() && !attachment) || isComposing}
                      className={cn(
                        'h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-white transition-all shadow-md active:scale-95 disabled:scale-100',
                        isDark
                          ? 'bg-[#1b8f6a] hover:bg-[#20ab7f] disabled:bg-white/5 disabled:text-slate-600'
                          : 'bg-[#163f36] hover:bg-[#205b4e] disabled:bg-slate-200 disabled:text-slate-400'
                      )}
                      aria-label="Send Message"
                    >
                      <Send className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </footer>

            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* LANDING HEADER COMPONENT */
function LandingHeader({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const isDark = theme === 'dark';
  return (
    <header className="mx-auto flex h-[76px] max-w-7xl w-full items-center justify-between px-5 lg:px-8 relative z-20">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b8f6a] text-white shadow-md">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-black uppercase tracking-wider leading-none">Doubt Slayer</h1>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5 block">JEE Diagnostic Tutor</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={cn(
          'hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border px-2.5 py-1.5 rounded-lg',
          isDark ? 'border-white/5 bg-[#101a15]/50 text-slate-300' : 'border-slate-200 bg-white/50 text-slate-600'
        )}>
          <span>Physics</span>
          <span className="opacity-20">•</span>
          <span>Chemistry</span>
          <span className="opacity-20">•</span>
          <span>Math</span>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className={cn(
            'p-2 rounded-lg border transition duration-300',
            isDark ? 'border-white/5 hover:bg-white/5 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          )}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>
    </header>
  );
}

/* TUTOR PREVIEW CARD ON LANDING SCREEN */
function TutorPreview({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
      className={cn(
        'rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur flex flex-col justify-between min-h-[380px]',
        isDark ? 'border-white/5 bg-[#101a15]/60 text-white' : 'border-slate-200 bg-white/70 text-slate-800'
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1b8f6a]">Pedagogical Engine Demo</p>
          <h3 className="text-lg font-black tracking-tight mt-0.5">Socratic Exchange Loop</h3>
        </div>
        <div className="h-7 w-7 rounded bg-emerald-500/10 flex items-center justify-center text-[#1b8f6a]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-3.5 my-4">
        {/* Student bubble */}
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className={cn(
            'p-3.5 rounded-xl text-xs font-bold leading-normal self-end max-w-[90%] shadow-sm',
            isDark ? 'bg-[#1b8f6a] text-white' : 'bg-[#163f36] text-white'
          )}
        >
          <span className="block text-[8px] font-black uppercase opacity-60 tracking-wider mb-1">Student</span>
          <Latex>{"I applied conservation of energy, but the speed of the cylinder at bottom is wrong."}</Latex>
        </motion.div>

        {/* Tutor bubble */}
        <motion.div
          animate={{ x: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
          className={cn(
            'p-3.5 rounded-xl text-xs font-bold leading-normal border max-w-[90%] shadow-sm',
            isDark ? 'border-white/5 bg-[#16241e] text-emerald-400' : 'border-slate-200 bg-[#fbfcfa] text-[#163f36]'
          )}
        >
          <span className="block text-[8px] font-black uppercase opacity-60 tracking-wider mb-1">Tutor</span>
          <Latex>{"Did you account for the rotational kinetic energy of the rolling cylinder? Write down its equation."}</Latex>
        </motion.div>

        {/* Student bubble 2 */}
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 2 }}
          className={cn(
            'p-3.5 rounded-xl text-xs font-bold leading-normal self-end max-w-[90%] shadow-sm',
            isDark ? 'bg-[#1b8f6a] text-white' : 'bg-[#163f36] text-white'
          )}
        >
          <span className="block text-[8px] font-black uppercase opacity-60 tracking-wider mb-1">Student</span>
          <Latex>{"Ah, I forgot $K_{rot} = \\frac{1}{2} I \\omega^2$. Reworking now."}</Latex>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-dashed border-slate-700/10">
        {['Act 1: Diagnose', 'Act 2: Repair', 'Act 3: Reconstruct'].map((act, index) => (
          <div key={act} className={cn('p-2 rounded-lg border text-center', isDark ? 'border-white/5 bg-white/5' : 'border-slate-250 bg-slate-50')}>
            <span className="block text-[8px] text-slate-400 font-bold uppercase">{act}</span>
            <div className="mt-2 h-1 overflow-hidden rounded bg-slate-700/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${30 + index * 35}%` }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                className="h-full bg-[#1b8f6a] rounded"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* CHAT SIDEBAR COMPONENT (DASHBOARD NAVIGATION & CHAT HISTORY) */
function ChatSidebar({
  sessions,
  currentId,
  theme,
  onDashboard,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: {
  sessions: Session[];
  currentId: string | null;
  theme: 'dark' | 'light';
  onDashboard: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
}) {
  const isDark = theme === 'dark';
  return (
    <div className="flex h-full flex-col">
      {/* Sidebar Top bar */}
      <div className={cn('p-4 border-b shrink-0', isDark ? 'border-white/5' : 'border-slate-200')}>
        <button
          type="button"
          onClick={onDashboard}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition mb-4',
            isDark ? 'border-white/5 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit to Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold bg-[#1b8f6a] hover:bg-[#20ab7f] text-white shadow transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New Diagnosis Chat
        </button>
      </div>

      {/* Sidebar Middle Chat logs */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <History className="h-3.5 w-3.5" />
          <span>Active Session Logs</span>
        </div>

        {sessions.length === 0 ? (
          /* Dynamic empty state with pulsing SVG logo */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center py-10"
          >
            <div className="h-16 w-16 bg-[#1b8f6a]/5 rounded-full flex items-center justify-center mb-3">
              <Clock3 className="h-6 w-6 text-slate-500 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-400">Workspace is empty.</p>
            <p className="text-[10px] text-slate-500 mt-1">Open a new doubt above to start diagnosing.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {sessions.map((item) => {
              const isActive = item.id === currentId;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSession(item.id)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer relative group flex justify-between items-start',
                    isActive
                      ? isDark
                        ? 'border-emerald-500/30 bg-[#16241e] text-white shadow-md'
                        : 'border-[#163f36]/30 bg-[#f3f9f5] text-slate-900 shadow-md'
                      : isDark
                      ? 'border-white/5 bg-[#101a15] hover:bg-white/5 hover:border-white/10 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        item.topic === 'Calculus' ? 'bg-amber-500' : 'bg-emerald-500'
                      )} />
                      <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                        {item.topic}
                      </span>
                    </div>
                    <p className="text-xs font-bold truncate leading-snug">{item.title}</p>
                    <p className="text-[9px] mt-1 text-slate-400">{item.state} • {item.date}</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => onDeleteSession(e, item.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar Footer info */}
      <div className={cn('p-4 border-t text-xs shrink-0', isDark ? 'border-white/5' : 'border-slate-200')}>
        <div className={cn('p-3 rounded-xl', isDark ? 'bg-white/5' : 'bg-slate-50')}>
          <div className="flex items-center gap-2 font-bold mb-1 text-[#1b8f6a]">
            <Upload className="h-3.5 w-3.5" />
            <span>Vision Engine Hooked</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Take a snap or attach files. The AI parser extracts math expressions natively.
          </p>
        </div>
      </div>
    </div>
  );
}

/* MESSAGE BUBBLE COMPONENT */
function MessageBubble({ message, theme }: { message: ChatMessage; theme: 'dark' | 'light' }) {
  const isStudent = message.role === 'student';
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex w-full', isStudent ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm flex flex-col',
          isStudent
            ? isDark
              ? 'bg-[#1b8f6a] text-white rounded-tr-sm'
              : 'bg-[#163f36] text-white rounded-tr-sm'
            : isDark
            ? 'border border-white/5 bg-[#101a15] text-slate-100 rounded-tl-sm'
            : 'border border-slate-200 bg-white text-slate-800 rounded-tl-sm'
        )}
      >
        <div className="flex items-center justify-between gap-6 mb-1 border-b border-dashed border-slate-700/5 pb-1">
          <span className={cn(
            'text-[9px] uppercase font-black tracking-widest',
            isStudent ? 'text-white/60' : 'text-[#d06b38]'
          )}>
            {isStudent ? 'Student' : 'Tutor (Act ' + (message.content.includes('$') || message.content.includes('integral') ? '2' : '1') + ')'}
          </span>
          <span className="text-[9px] opacity-40 shrink-0">{message.meta}</span>
        </div>
        <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
          <Latex>{message.content.replace(/\\\$/g, '$')}</Latex>
        </div>
      </div>
    </motion.div>
  );
}

/* TYPING INDICATOR BUBBLE */
function TypingIndicator({ theme }: { theme: 'dark' | 'light' }) {
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className={cn(
        'rounded-2xl border px-4 py-3 shadow-sm',
        isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
      )}>
        <div className="flex items-center gap-1.5 h-4 justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1b8f6a] animate-typing-1" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#1b8f6a] animate-typing-2" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#1b8f6a] animate-typing-3" />
        </div>
      </div>
    </motion.div>
  );
}
