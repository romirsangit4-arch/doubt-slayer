'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Settings as SettingsIcon, LogOut, LogIn, ChevronLeft, ImagePlus, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '@/components/firebase-provider';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  imageBase64?: string;
  hint?: boolean;
}

export default function ChatPage() {
  const { user, signInWithGoogle, logout } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  
  const [activeSession, setActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<string>('idle');
  const [trialMode, setTrialMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeSession]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setStagedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const startNewSession = async (base64: string | null | undefined, initialMessage?: string) => {
    setIsTyping(true);
    try {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start_session',
          sessionId: newSessionId,
          imageBase64: base64,
          content: initialMessage, // optional
          userId: user?.uid 
        })
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }
      
      if (data.question) {
        setMessages([
          { role: 'user', content: initialMessage || 'Uploaded an image.', imageBase64: base64 || undefined },
          { role: 'model', content: data.question }
        ]);
        setActiveSession(true);
        setSessionPhase('diagnosing');
      } else if (data.error) {
        setMessages([{ role: 'model', content: `API Error: ${data.error}. Please ensure your Gemini API Key is correctly configured in the platform.` }]);
      }
    } catch (e) {
      console.error(e);
      setMessages([{ role: 'model', content: "Something went wrong initializing the session." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !stagedImage) || isTyping) return;

    const currentInput = input;
    const currentImage = stagedImage;
    setInput('');
    setStagedImage(null);

    if (!activeSession) {
      await startNewSession(currentImage, currentInput);
      return;
    }

    const newMessage: ChatMessage = {
      role: 'user',
      content: currentInput,
      imageBase64: currentImage || undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          sessionId,
          userId: user?.uid,
          content: currentInput
        })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'model', content: data.response }]);
        setSessionPhase(data.phase);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'model', content: `API Error: ${data.error}` }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: 'model', content: "Connection lost. Try again." }]);
    } finally {
      setIsTyping(false);
      setTimeout(scrollToBottom, 50); // Ensure scroll after state update
    }
  };

  const revealHint = async () => {
    if (isTyping) return;
    setIsTyping(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_hint',
          sessionId,
          userId: user?.uid
        })
      });
      const data = await res.json();
      if (data.hint) {
        setMessages(prev => [...prev, { role: 'model', content: '💡 Hint: ' + data.hint }]);
        setTimeout(scrollToBottom, 50);
      }
    } catch (_) {
       console.error("Failed to get hint");
    } finally {
      setIsTyping(false);
    }
  };

  const isLandingScreen = !user && !trialMode;

  if (isLandingScreen) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-white font-sans overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md z-10 w-full fixed top-0 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Doubt Slayer</h1>
          </div>
          <button 
            onClick={() => signInWithGoogle()}
            className="text-sm font-medium hover:text-indigo-300 transition-colors hidden sm:block"
          >
            Sign In
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24 text-center relative max-w-4xl mx-auto w-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="z-10 flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-indigo-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Diagnostic Tutoring Engine</span>
            </div>
            <h2 className="text-5xl sm:text-7xl font-bold tracking-tighter mb-6 leading-tight">
              Slay your <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">academic doubts.</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl">
              Don&apos;t just get answers. Understand the concepts behind HC Verma, Irodov, and competitive exams with guided, step-by-step Socratic problem-solving.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => signInWithGoogle()}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:bg-slate-100 transition shadow-xl w-full sm:w-auto"
              >
                <LogIn className="w-5 h-5" />
                Login with Google
              </button>
              <button 
                onClick={() => setTrialMode(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 border border-white/5 transition w-full sm:w-auto shadow-xl"
              >
                Try Free Chat
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 text-slate-900 font-sans sm:pb-0 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          {activeSession ? (
            <button
              onClick={() => {
                setActiveSession(false);
                setSessionId(null);
                setSessionPhase('idle');
                setMessages([]);
                setStagedImage(null);
                setInput('');
              }}
              className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          ) : (
             <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
               <Shield className="w-4 h-4 text-white" />
             </div>
          )}
          
          <div className="flex flex-col">
            <h1 className="text-[15px] font-bold tracking-tight">Doubt Slayer</h1>
            <span className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">
               {isTyping ? 'typing...' : '● online'} {activeSession && ` | ${sessionPhase}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-gray-50 transition" onClick={() => setShowSettings(true)}>
            <SettingsIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full flex flex-col" id="chat-container">
        <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 p-4">
          {!activeSession && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 py-10 opacity-90 min-h-[50vh]">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Shield className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Which topic do you want to finish today?</h2>
              <p className="text-[15px] text-slate-500 mb-8 text-center max-w-md">You can upload a specific question image or text, too!</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-slate-700 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition shadow-sm"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex flex-col space-y-4">
              {messages.map((m, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx} 
                  className={cn(
                    "flex max-w-[90%] sm:max-w-[85%]", 
                    m.role === 'user' ? "self-end justify-end" : "self-start justify-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed text-[15px] overflow-hidden shadow-sm",
                    m.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-br-sm" 
                      : "bg-white text-slate-900 rounded-bl-sm border border-gray-200"
                  )}>
                    {m.imageBase64 && (
                       <img 
                       src={`data:image/jpeg;base64,${m.imageBase64}`} 
                       className="w-full h-auto max-h-48 object-cover rounded-md mb-2 border border-black/10" 
                       alt="Attached context" 
                     />
                    )}
                    {m.role === 'model' ? (
                      <div className="text-[15px] leading-relaxed break-words">
                        <Latex>{m.content.replace(/\\\$/g, '$')}</Latex>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </motion.div>
              ))}
              {activeSession && !isTyping && (
                 <div className="flex justify-start py-2">
                    <button 
                      onClick={revealHint} 
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-100 text-amber-800 text-[13px] font-bold tracking-wide rounded-full hover:bg-amber-200 active:scale-95 transition shadow-sm"
                    >
                       💡 Ask for Hint
                    </button>
                 </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} className="h-4 shrink-0" />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-2 sm:p-4 shrink-0 pb-safe">
         <div className="max-w-3xl mx-auto">
            <AnimatePresence>
              {stagedImage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 relative inline-block"
                >
                  <img src={`data:image/jpeg;base64,${stagedImage}`} className="h-20 w-auto rounded-lg border border-gray-200 shadow-md" alt="Staged" />
                  <button 
                    onClick={() => setStagedImage(null)}
                    className="absolute -top-2 -right-2 bg-white border border-gray-200 text-slate-600 p-1 rounded-full shadow hover:bg-gray-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl pl-3 pr-2 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white transition shrink-0 bg-transparent relative group"
                title="Use Camera"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-white transition shrink-0 bg-transparent -ml-2"
                title="Upload Image"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />

              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleImageSelect}
              />

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message tutor..."
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-[15px] py-3 text-slate-900 placeholder-slate-400 leading-tight block w-full"
                rows={1}
              />
              
              <button 
                onClick={sendMessage}
                disabled={(!input.trim() && !stagedImage) || isTyping}
                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:bg-gray-200 disabled:text-slate-400 transition-colors shrink-0 flex items-center justify-center min-w-[48px] min-h-[48px] shadow-sm"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
         </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-stretch text-left"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border-t border-gray-100 pt-6">
                {user ? (
                   <div className="flex flex-col gap-4">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                         {user.email?.charAt(0).toUpperCase()}
                       </div>
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                       </div>
                     </div>
                     <button 
                      onClick={async () => {
                        await logout();
                        setTrialMode(false);
                      }}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-slate-700 font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 border border-gray-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                   </div>
                ) : (
                  <button 
                    onClick={async () => {
                      await signInWithGoogle();
                    }}
                    className="w-full bg-white hover:bg-gray-50 text-slate-700 font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 border border-gray-200 shadow-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in with Google
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

