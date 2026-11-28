import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Plus,
  Send,
  SendHorizontal,
  Download,
  AlertCircle,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Bot,
} from 'lucide-react';
import { AdminTab } from '../../types';
import { useAdminData } from '../../context/AdminDataContext';
import { adminApi } from '../../services/adminApi';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: AdminTab) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  type?: 'text' | 'course-card' | 'trainee-card' | 'table' | 'chart';
  sources?: string[];
  data?: any;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const { courses, trainees, pendingApprovals } = useAdminData();
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'bot',
      text: 'Hello! I am your Capacity Connect Admin Intelligence Assistant, powered by NVIDIA NIM (Moonshot AI Kimi K3.1 Pro). All answers are grounded in real-time PostgreSQL database records.',
    },
  ]);

  const [toastNote, setToastNote] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputVal.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      // Map history for conversational context
      const historyPayload = messages
        .filter((m) => m.text)
        .slice(-4)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
          text: m.text!,
        }));

      const res = await adminApi.sendAiChat(query, historyPayload);

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: res?.message || 'Analyzed records successfully.',
        type: res?.type || 'text',
        sources: res?.sources?.map((s: any) => s.entity) || [],
        data: res?.data,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-err-${Date.now()}`,
          sender: 'bot',
          text: `An error occurred while contacting the AI intelligence assistant: ${err.message || 'Please try again.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
      {/* Toast inside drawer */}
      {toastNote && (
        <div className="absolute top-14 sm:top-16 left-3 right-3 sm:left-4 sm:right-4 z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg flex items-center justify-between">
          <span>{toastNote}</span>
          <button onClick={() => setToastNote(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Capacity assistant
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Online · Admin analytics</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  id: 'init-1',
                  sender: 'bot',
                  text: 'Hello! I can answer questions on IMD courses, trainee progress, competency gaps, and approvals.',
                },
              ]);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            title="Close assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context filters bar */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-[10px] sm:text-[11px] font-medium text-slate-600 select-none shrink-0">
        <span className="text-slate-400 font-normal">Context</span>
        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
          Courses
        </span>
        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
          Last 30 days
        </span>
        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
          All divisions
        </span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="text-center">
          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
            Today, 09:41
          </span>
        </div>

        {messages.map((m) => {
          if (m.sender === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-xs p-3.5 text-xs font-medium leading-relaxed shadow-xs">
                  {m.text}
                </div>
              </div>
            );
          }

          // Bot text message
          if (m.text) {
            return (
              <div key={m.id} className="flex gap-2.5 items-start group">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="max-w-[88%] bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-800 leading-relaxed shadow-xs relative">
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Source: {m.sources.join(', ')}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.text!)}
                        className="text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Course card response
          if (m.type === 'course-card') {
            return (
              <div key={m.id} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="max-w-[90%] space-y-2">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-800 space-y-3 shadow-xs">
                    <p className="font-medium text-slate-900">
                      Three active courses are below 50% completion.
                    </p>

                    <div className="space-y-2 pt-1 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            1
                          </span>
                          <span className="font-semibold text-slate-900">
                            Cyclone Track Analysis
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 w-[38%]" />
                          </div>
                          <span className="font-bold text-slate-800 tabular-nums">38%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            2
                          </span>
                          <span className="font-semibold text-slate-900">
                            Radar Data Quality
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-[44%]" />
                          </div>
                          <span className="font-bold text-slate-800 tabular-nums">44%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            3
                          </span>
                          <span className="font-semibold text-slate-900">
                            Numerical Weather Models
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-[47%]" />
                          </div>
                          <span className="font-bold text-slate-800 tabular-nums">47%</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-600 text-[11px] leading-relaxed pt-1">
                      Most learners drop off after module 3. Want the trainees who have not started the final assessment?
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          // Trainee list card
          if (m.type === 'trainee-card') {
            return (
              <div key={m.id} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="max-w-[90%] space-y-2.5">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-800 space-y-3 shadow-xs">
                    <p className="font-medium text-slate-900">
                      Found <span className="font-bold text-slate-950">46 trainees</span>, 28 of them in the Eastern region.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setToastNote('Assessment reminder emails dispatched to 46 trainees.');
                        }}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                      >
                        <SendHorizontal className="w-3 h-3" />
                        <span>Send reminder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToastNote('Exporting 46 trainee records as CSV...');
                        }}
                        className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export list</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-500 text-xs">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>Grounding query with PostgreSQL and NVIDIA Kimi K3.1 Pro...</span>
          </div>
        )}
      </div>

      {/* Suggested quick chips */}
      <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-[11px] sm:text-xs shrink-0">
        <button
          type="button"
          onClick={() => handleSend('Show competency gaps')}
          className="whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer"
        >
          Competency gaps
        </button>
        <button
          type="button"
          onClick={() => handleSend('Show trainer workload distribution')}
          className="whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer"
        >
          Trainer workload
        </button>
        <button
          type="button"
          onClick={() => handleSend('Which courses have the lowest completion rate?')}
          className="whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer"
        >
          Lowest completion
        </button>
        <button
          type="button"
          onClick={() => handleSend('How many trainers and trainees are registered?')}
          className="whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer"
        >
          User counts
        </button>
      </div>

      {/* Input box */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <button
            type="button"
            className="absolute left-3 text-slate-400 hover:text-slate-600"
            title="Attach data filter"
          >
            <Plus className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask about courses, trainees, analytics..."
            className="w-full pl-9 pr-10 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
          />

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="absolute right-1 w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-blue-600 disabled:opacity-40 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center mt-1.5 sm:mt-2">
          Answers use live portal data. Check important figures before sharing.
        </p>
      </div>
    </div>
  );
};
