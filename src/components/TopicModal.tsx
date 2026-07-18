import React, { useState } from 'react';
import { Sparkles, ArrowRight, Compass, Search, ChevronRight, X, Loader2 } from 'lucide-react';

interface SubTopic {
  title: string;
  score: number;
  reasoning: string;
}

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartResearch: (query: string) => void;
}

const CATEGORIES = [
  { name: 'Technology & AI', prompt: 'Emerging technology and artificial intelligence' },
  { name: 'Medicine & Biotech', prompt: 'Medical breakthroughs and biotechnology' },
  { name: 'Climate & Energy', prompt: 'Climate change solutions and renewable energy' },
  { name: 'Economics', prompt: 'Global economics and future markets' },
];

export default function TopicModal({ isOpen, onClose, onStartResearch }: TopicModalProps) {
  const [step, setStep] = useState<'SELECT' | 'EXPLORING' | 'SUBTOPICS'>('SELECT');
  const [customTopic, setCustomTopic] = useState('');
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);

  if (!isOpen) return null;

  const handleExplore = async (query: string) => {
    setStep('EXPLORING');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, headless: true })
      });
      const data = await res.json();
      if (data.topics && data.topics.length > 0) {
        setSubTopics(data.topics);
        setStep('SUBTOPICS');
      } else {
        // Fallback if exploration fails
        onStartResearch(query);
        onClose();
      }
    } catch (e) {
      onStartResearch(query);
      onClose();
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTopic.trim()) {
      handleExplore(customTopic);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-[600px] max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            Research Ideation
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'SELECT' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">Pre-set Categories</h3>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((cat, i) => (
                    <button
                      key={i}
                      onClick={() => handleExplore(cat.prompt)}
                      className="p-3 text-left border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group flex flex-col gap-1"
                    >
                      <span className="font-semibold text-slate-800 group-hover:text-blue-700">{cat.name}</span>
                      <span className="text-xs text-slate-500 group-hover:text-blue-600/70 truncate">{cat.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wider">Custom Topic</h3>
                <form onSubmit={handleCustomSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. quantum physics"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customTopic.trim()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    Explore <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {step === 'EXPLORING' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">Scouring the web...</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Our AI is currently browsing search results to identify highly significant and trending sub-topics for you.
                </p>
              </div>
            </div>
          )}

          {step === 'SUBTOPICS' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Select a Specific Focus</h3>
                <p className="text-sm text-slate-500 mt-1">We found these high-value areas to research.</p>
              </div>
              
              <div className="space-y-3">
                {subTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onStartResearch(topic.title);
                      onClose();
                    }}
                    className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-4"
                  >
                    <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-blue-50 rounded-lg group-hover:bg-blue-600 transition-colors">
                      <span className="text-xs font-bold text-blue-600 group-hover:text-white transition-colors">Score</span>
                      <span className="text-sm font-black text-blue-700 group-hover:text-white transition-colors">{topic.score}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                        {topic.title}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{topic.reasoning}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
