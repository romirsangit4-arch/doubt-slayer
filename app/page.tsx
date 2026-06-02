'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, MoreVertical, ChevronLeft, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  imageBase64?: string; // Only populated if user attached an image to this specific message
}

interface ProcessedImageInfo {
  problem_text: string;
  detected_topic: string;
  ocr_confidence: number;
  base64Data: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [act, setAct] = useState<1 | 2 | 3>(1);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [problemInfo, setProblemInfo] = useState<ProcessedImageInfo | null>(null);
  const [activeSession, setActiveSession] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

  const processStagedImage = async (base64: string) => {
    setIsTyping(true);
    try {
      const res = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      if (data.problem_text) {
        setProblemInfo({
          ...data,
          base64Data: base64
        });
        
        // Initial AI kickoff
        const starterMessage = `I see a problem about ${data.detected_topic}. ${data.ocr_confidence < 0.8 ? `I read the problem as: "${data.problem_text}". Is this correct? ` : ''}Let's break it down. What's the very first step or concept we need to apply here?`;
        
        setMessages([
          { role: 'model', content: starterMessage }
        ]);
        setActiveSession(true);
      }
    } catch (e) {
      console.error(e);
      setMessages([{ role: 'model', content: "I couldn't read that image clearly. Could you describe the problem?" }]);
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

    // If starting a totally new session by just uploading an image first
    if (!activeSession && currentImage) {
      await processStagedImage(currentImage);
      return;
    }

    const newMessage: ChatMessage = {
      role: 'user',
      content: currentInput,
      imageBase64: currentImage || undefined
    };

    const newHistory = [...messages, newMessage];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          sessionData: {
            act: act,
            topic: problemInfo?.detected_topic,
            problem: problemInfo?.problem_text
          }
        })
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      // Initialize the AI message bubble
      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          aiResponse += chunk;
          
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = aiResponse;
            return updated;
          });
        }
      }
      
      // Simulate simple paywall logic after a few exchanges if still in Act 1
      if (newHistory.length > 5 && act === 1 && !showPaywall) {
        setTimeout(() => {
          setShowPaywall(true);
        }, 2000);
      }

    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: 'model', content: "Connection lost. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 text-slate-900 font-sans sm:pb-0 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-wide">JEE Tutor</h1>
            <span className="text-xs text-emerald-500 font-mono">
               {isTyping ? 'typing...' : '● online'}
            </span>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-50 transition" onClick={() => setAct(prev => (prev % 3) + 1 as 1|2|3)}>
          <MoreVertical className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto flex flex-col relative px-4 pt-4 pb-20">
        {/* Pinned problem thumbnail */}
        {problemInfo && (
          <div className="sticky top-0 z-10 mx-auto mb-6 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl p-2 flex items-start gap-4 shadow-sm w-fit max-w-[90%]">
            <img 
              src={`data:image/jpeg;base64,${problemInfo.base64Data}`} 
              className="w-16 h-16 object-cover rounded-md border border-gray-100" 
              alt="Problem" 
            />
            <div className="flex flex-col justify-center min-w-0 pr-4">
              <span className="text-xs text-slate-500 font-medium tracking-wider uppercase mb-1">Act {act} • {problemInfo.detected_topic}</span>
              <p className="text-sm text-slate-900 line-clamp-2 leading-tight">
                {problemInfo.problem_text}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!activeSession && messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-90">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">Snap a problem to begin</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">Upload HC Verma, Irodov, or coaching sheets.</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col space-y-4 justify-end min-h-full">
          {messages.map((m, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx} 
              className={cn(
                "flex max-w-[85%] sm:max-w-[75%]", 
                m.role === 'user' ? "self-end justify-end" : "self-start justify-start"
              )}
            >
              <div className={cn(
                "px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed text-[15px]",
                m.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-br-sm shadow-sm" 
                  : "bg-white text-slate-900 rounded-bl-sm border border-gray-200 shadow-sm"
              )}>
                {m.imageBase64 && (
                   <img 
                   src={`data:image/jpeg;base64,${m.imageBase64}`} 
                   className="w-full h-auto max-h-48 object-cover rounded-md mb-2 border border-gray-200" 
                   alt="Attached context" 
                 />
                )}
                {m.content}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-2 sm:p-4 shrink-0 pb-safe">
         <div className="max-w-3xl mx-auto">
            {/* Staged Image Preview */}
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

            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl pl-3 pr-2 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white transition shrink-0"
              >
                <Camera className="w-6 h-6" />
              </button>
              
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
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
                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:bg-gray-200 disabled:text-slate-400 transition-colors shrink-0 flex items-center justify-center min-w-[48px] min-h-[48px]"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
         </div>
      </div>

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Continue to repair and solve</h2>
              <p className="text-sm text-slate-500 mb-8">
                Your Act 1 free session is complete. Unlock unlimited micro-examples and full solutions.
              </p>
              
              <button 
                onClick={() => setShowPaywall(false)} // Simplification for preview
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-xl transition flex items-center justify-center gap-2"
              >
                Unlock Session — ₹50
              </button>
              
              <button onClick={() => setShowPaywall(false)} className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-700 transition">
                Close (Preview Only)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
