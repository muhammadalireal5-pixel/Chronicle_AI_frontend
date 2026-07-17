'use client';

import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Activity, Database, Sparkles, CheckCircle2, AlertTriangle, FileText, BookOpen, Download, LayoutPanelLeft, X, MessageSquare, Send, Plus, History, ChevronRight, Trash2 } from 'lucide-react';
import { SignInButton, Show, UserButton, useAuth, useUser } from '@clerk/nextjs';
import TopicModal from './TopicModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useReactToPrint } from 'react-to-print';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

interface ResearchConsoleProps {
  researchId: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'LOG' | 'STATUS_UPDATE' | 'REPORT';
}

function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    mermaid.render(`mermaid-${Math.random().toString(36).substring(2, 9)}`, chart)
      .then(({ svg }) => setSvg(svg))
      .catch(console.error);
  }, [chart]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} className="flex justify-center my-8 bg-white border border-slate-200 p-4 rounded-xl shadow-sm overflow-x-auto" />;
}

export default function ResearchConsole({ researchId }: ResearchConsoleProps) {
  const [activeResearchId, setActiveResearchId] = useState(researchId);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string>("IDLE");
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'report'>('pipeline');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Chat History & Chatbot State
  const [pastChats, setPastChats] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmails, setShareEmails] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [headless, setHeadless] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const { userId } = useAuth();
  const { user } = useUser();

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Chronicle-Report-${new Date().toISOString().slice(0, 10)}`,
  });

  const fetchPastChats = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chats/${userId}`);
      const data = await res.json();
      setPastChats(data.chats || []);
    } catch (e) {
      console.error("Failed to fetch past chats");
    }
  };

  useEffect(() => {
    fetchPastChats();
  }, [userId]);

  const loadChat = async (chat: any) => {
    setActiveResearchId(chat.researchId);
    setQuery(chat.query || "");
    setStatus(chat.status || "COMPLETED");
    setReport(chat.finalReport || null);
    setActiveTab(chat.status === "COMPLETED" ? 'report' : 'pipeline');
    setLogs([]);
    
    if (chat.researchId) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/${chat.researchId}`);
      const data = await res.json();
      setChatMessages(data.messages || []);
    }
  };

  const createNewChat = () => {
    setActiveResearchId('new-session-' + Math.random().toString(36).substring(2, 10));
    setQuery("");
    setReport(null);
    setLogs([]);
    setStatus("IDLE");
    setActiveTab("pipeline");
    setDocUrl(null);
    setShowExploreModal(true);
  };
  const deleteChat = async (resId: string) => {
    if (!confirm("Are you sure you want to delete this research session?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chats/${resId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (resId === activeResearchId) {
          createNewChat();
        } else {
          fetchPastChats();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsChatLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeResearchId, message: msg })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const resumeResearch = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeResearchId })
    });
    setActiveTab('pipeline');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const startResearch = async (overrideQuery?: string) => {
    const finalQuery = typeof overrideQuery === 'string' ? overrideQuery : query;
    if (!finalQuery.trim()) return;
    setQuery(finalQuery); // sync state if overridden
    
    let targetId = activeResearchId;
    const isDefault = activeResearchId.startsWith('new-session-') || activeResearchId === 'demo-session-1';
    const isSessionFinished = status === 'COMPLETED';

    if (isDefault || isSessionFinished) {
      targetId = Math.random().toString(36).substring(2, 10);
      setActiveResearchId(targetId);
    }

    setStatus("STARTING");
    setLogs([]);
    setReport(null);
    setActiveTab('pipeline');

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/start`, {
      method: 'POST',
      body: JSON.stringify({ id: targetId, query: finalQuery, userId, headless }),
      headers: { 'Content-Type': 'application/json' }
    });

    fetchPastChats(); // Instantly show RUNNING item in sidebar

    const sse = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/research/stream?id=${targetId}`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "STATUS_UPDATE") {
        setStatus(data.message);
        if (data.message === "COMPLETED") {
          setActiveTab('report');
          fetchPastChats();
        } else if (data.message === "PAUSED") {
          setActiveTab('pipeline');
        }
      } else if (data.type === "REPORT") {
        setReport(data.message);
      } else {
        setLogs((prev) => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          text: data.message,
          type: 'LOG',
        }]);
      }
    };

    sse.onerror = () => {
      sse.close();
    };
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, chatMessages]);

  const requestInterrupt = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/interrupt`, {
      method: 'POST',
      body: JSON.stringify({ id: activeResearchId }),
      headers: { 'Content-Type': 'application/json' }
    });
    setStatus("PAUSING...");
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronicle-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareViaEmail = async (emailsList: string[]) => {
    if (!report) return;
    setIsExporting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, title: `${query} - Research Report`, emails: emailsList })
      });
      const data = await res.json();
      if (data.success) {
        alert("Email sent successfully via Resend!");
      } else {
        alert("Failed to send email: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error sending email.");
    } finally {
      setIsExporting(false);
      setShowShareModal(false);
    }
  };

  const isIdle = status === "IDLE";
  const isDone = status === "COMPLETED" || status === "PAUSED";
  const isRunning = !isIdle && !isDone && status !== "PAUSING...";

  const extractedClaims = logs.filter(l => l.text.includes('Extracted Claim:'));
  const excludedClaims = logs.filter(l => l.text.includes('❌ Excluded'));

  // Parse claim text and source from log format: "Extracted Claim: text [via Source Title]"
  const parseClaim = (logText: string) => {
    const stripped = logText.replace('Extracted Claim: ', '');
    const match = stripped.match(/^(.*?)\s*\[via (.+?)\]$/);
    if (match) {
      return { text: match[1].trim(), source: match[2].trim() };
    }
    return { text: stripped, source: '' };
  };

  const statusColor = {
    IDLE: 'bg-slate-100 text-slate-500 border-slate-200',
    RUNNING: 'bg-teal-50 text-teal-600 border-teal-200',
    SYNTHESIZING: 'bg-blue-50 text-blue-600 border-blue-200',
    COMPLETED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    PAUSED: 'bg-amber-50 text-amber-600 border-amber-200',
    STARTING: 'bg-purple-50 text-purple-600 border-purple-200',
    'PAUSING...': 'bg-rose-50 text-rose-600 border-rose-200',
  }[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/20 flex overflow-hidden">
      <TopicModal 
        isOpen={showExploreModal} 
        onClose={() => setShowExploreModal(false)} 
        onStartResearch={(q) => startResearch(q)} 
        headless={headless}
      />

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-[480px] max-w-[90vw] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Share Report via Email</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter email addresses separated by commas to email this research report as rich HTML.
              </p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Collaborator Emails</label>
              <textarea
                placeholder="e.g. user@gmail.com, colleague@gmail.com"
                value={shareEmails}
                onChange={(e) => setShareEmails(e.target.value)}
                className="w-full min-h-[80px] p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => shareViaEmail(shareEmails.split(',').map(e => e.trim()).filter(Boolean))}
                disabled={isExporting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isExporting ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {isExporting ? 'Sending...' : 'Share via Email'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* LEFT SIDEBAR: Chat History */}
      <div className="w-[280px] bg-white border-r border-slate-200 h-screen flex flex-col shrink-0 z-30">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <History className="w-5 h-5 text-blue-600" />
            Chat History
          </div>
          <button onClick={createNewChat} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors shadow-sm" title="New Chat">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pastChats.map((c, i) => (
            <div key={i} className="relative group w-full">
              <button 
                onClick={() => loadChat(c)} 
                className={`w-full text-left p-3 pr-10 rounded-xl flex flex-col gap-1 transition-all ${c.researchId === activeResearchId ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white hover:bg-slate-50 border border-slate-200'}`}
              >
                <span className={`text-sm font-medium truncate max-w-[180px] ${c.researchId === activeResearchId ? 'text-white' : 'text-slate-800'}`}>
                  {c.query || 'New Research'}
                </span>
                <span className={`text-[10px] uppercase font-semibold ${c.researchId === activeResearchId ? 'text-blue-200' : 'text-slate-400'}`}>
                  {c.status}
                </span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteChat(c.researchId); }}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${c.researchId === activeResearchId ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}
                title="Delete Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {pastChats.length === 0 && <div className="text-xs text-slate-400 text-center mt-4">No past chats</div>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'mr-[400px]' : ''} h-screen min-w-0`}>
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 z-40 px-8 py-4 shadow-sm">
          <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none">Chronicle</h1>
                <p className="text-xs text-slate-500 mt-0.5">Deep Research & Synthesis Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (isDone || isIdle) ? startResearch() : null}
                placeholder="Enter your research topic..."
                disabled={isRunning || status === "PAUSING..."}
                className="flex-1 md:w-[460px] bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400 disabled:opacity-50 text-slate-800"
              />
              {isIdle || isDone ? (
                <button
                  onClick={() => startResearch()}
                  disabled={!query.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-md shadow-blue-600/20 shrink-0"
                >
                  <Play className="w-4 h-4" /> {isDone ? 'Restart' : 'Start Research'}
                </button>
              ) : (
                <button
                  onClick={requestInterrupt}
                  disabled={status === "PAUSING..." || status === "SYNTHESIZING"}
                  className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-5 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 shrink-0"
                >
                  <Pause className="w-4 h-4" /> {status === "PAUSING..." ? "Pausing..." : "Interrupt"}
                </button>
              )}

              <div className="flex items-center gap-2 mr-3 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" 
                  id="headless-toggle"
                  checked={!headless}
                  onChange={(e) => setHeadless(!e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/40 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="headless-toggle" className="cursor-pointer select-none text-slate-600 hover:text-slate-800">Show Browser Activity</label>
              </div>
              <div className="pl-4 border-l border-slate-200 ml-1 flex items-center">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-screen-2xl mx-auto w-full px-8 py-8 flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
          
          {/* LEFT: Engine Status */}
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col min-h-0 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wider">Live Extraction Engine</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${statusColor}`}>
                  {status}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 shrink-0">
                {[
                  { label: 'Chunks', value: logs.filter(l => l.text.includes('Processing chunk')).length, color: 'text-slate-700' },
                  { label: 'Relevant', value: extractedClaims.length, color: 'text-teal-600' },
                  { label: 'Excluded', value: excludedClaims.length, color: 'text-rose-500' },
                ].map(s => (
                  <div key={s.label} className="p-4 text-center bg-white">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Log Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs bg-slate-50/30">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Database className="w-8 h-8 opacity-40" />
                    <p>Awaiting research start...</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 p-2 rounded-lg hover:bg-slate-100/50 transition-colors">
                      <span className="text-slate-400 shrink-0 pt-px">{log.timestamp}</span>
                      <span className={
                        log.text.includes('Extracted Claim:') ? 'text-teal-600 font-medium' :
                        log.text.includes('❌ Excluded') ? 'text-rose-500 line-through opacity-70' :
                        log.text.includes('Topic classified') ? 'text-purple-600 font-semibold' :
                        log.text.includes('Claims filtered') ? 'text-indigo-600 font-semibold' :
                        log.text.includes('Alignment Check') ? 'text-blue-600' :
                        log.text.includes('⚠️') ? 'text-rose-500' :
                        log.text.includes('✅') || log.text.includes('🧠') ? 'text-indigo-600' :
                        log.text.includes('Pass') ? 'text-amber-600 font-medium' :
                        'text-slate-600'
                      }>
                        {log.text.includes('Extracted Claim:') && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" />}
                        {(log.text.includes('⚠️') || log.text.includes('❌')) && <AlertTriangle className="inline w-3 h-3 mr-1 -mt-0.5" />}
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          {/* RIGHT: Report / Synthesis Panel */}
          <div className="flex-1 flex flex-col min-w-0 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">

              {/* Tab bar */}
              <div className="flex items-center justify-between px-5 pt-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
                <div className="flex gap-1">
                  {[
                    { id: 'pipeline', label: 'Synthesis View', icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { id: 'report', label: 'Final Report', icon: <BookOpen className="w-3.5 h-3.5" />, badge: report ? '✓' : null },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'pipeline' | 'report')}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg border-b-2 transition-all ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-blue-600 bg-blue-50'
                          : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.badge && <span className="ml-1 text-teal-600">{tab.badge}</span>}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <LayoutPanelLeft className="w-3.5 h-3.5" /> View All Claims
                  </button>
                  {report && (
                    <>
                      <button
                        onClick={() => handlePrint()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download as PDF
                      </button>
                      <button
                        onClick={() => {
                          setShareEmails(user?.primaryEmailAddress?.emailAddress || "");
                          setShowShareModal(true);
                        }}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-lg transition-all disabled:opacity-50"
                      >
                        {isExporting ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        {isExporting ? 'Sending...' : 'Share via Email'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                
                {/* PIPELINE TAB */}
                {activeTab === 'pipeline' && (
                  <div className="h-full max-w-3xl flex flex-col">
                    {isIdle ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-blue-400" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-slate-700 mb-1">Chronicle is ready</p>
                          <p className="text-sm">Enter a topic and hit Start to begin deep research</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                          <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest font-semibold">Research Topic</p>
                          <p className="text-slate-800 font-medium text-lg">{query}</p>
                        </div>


                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                          <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-semibold flex items-center justify-between">
                            Latest Extracted Knowledge Node
                            <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full text-[10px]">Fact #{extractedClaims.length}</span>
                          </p>
                          {extractedClaims.slice(-1).map((log, i) => {
                            const parsed = parseClaim(log.text);
                            return (
                              <div key={i} className="text-teal-800 font-mono text-sm leading-relaxed p-4 bg-teal-50 border border-teal-100 rounded-lg">
                                {parsed.text}
                                {parsed.source && (
                                  <span className="block text-xs text-teal-500 mt-2 font-sans italic">
                                    Source: {parsed.source}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {extractedClaims.length === 0 && (
                            <p className="text-slate-500 text-sm italic">Waiting for first claim...</p>
                          )}
                        </div>

                        {isRunning && (
                          <button
                            onClick={requestInterrupt}
                            className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-3 rounded-xl font-medium text-sm transition-all shadow-sm"
                          >
                            <MessageSquare className="w-4 h-4" /> Interrupt to talk with AI
                          </button>
                        )}

                        {status === "SYNTHESIZING" && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-center gap-3 shadow-sm">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            <p className="text-blue-800 text-sm font-medium">Synthesizing final research report from {extractedClaims.length} verified claims...</p>
                          </div>
                        )}

                        {status === "COMPLETED" && report && (
                          <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                              <p className="text-teal-800 text-sm font-medium">Research complete! Your full report is ready.</p>
                            </div>
                            <button onClick={() => setActiveTab('report')} className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors bg-white px-4 py-1.5 rounded-md border border-teal-200 shadow-sm">
                              View Report
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* REPORT TAB */}
                {activeTab === 'report' && (
                  <div className="h-full">
                    {report ? (
                      <div ref={reportRef} className="prose prose-slate max-w-none prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600 hover:prose-a:text-blue-800 p-8 bg-white">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              if (!inline && match && match[1] === 'mermaid') {
                                return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {report}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 min-h-[400px]">
                        <FileText className="w-8 h-8 text-slate-300" />
                        <p className="text-sm">Report will appear here after research completes.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
            
            {/* Chatbot at the very bottom, only visible when paused/interrupted */}
            {status === "PAUSED" && activeResearchId && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-lg bg-slate-50 flex flex-col shrink-0 animate-in slide-in-from-bottom duration-300">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700">AI Consultation</h3>
                </div>
                
                <div className="p-4 space-y-4 max-h-[220px] overflow-y-auto bg-white/50">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center italic py-4">No messages yet. Ask the AI a question or provide constraints.</p>
                  ) : (
                    chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl p-3 text-sm bg-white border border-slate-200 text-slate-800 rounded-bl-none flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        AI is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="mb-3 flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <span className="text-sm text-amber-800 font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> Research paused. Instruct AI before resuming.</span>
                    <button onClick={resumeResearch} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-amber-500/20">
                      Resume Research
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' ? sendChatMessage() : null}
                      placeholder="Message AI about this research..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-800 placeholder:text-slate-400"
                    />
                    <button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatLoading} className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center shadow-sm shadow-blue-600/20">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: All Claims */}
      <div 
        className={`fixed top-0 right-0 h-screen w-[400px] bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Extracted Claims Repository
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {extractedClaims.length} atomic facts extracted from sources
            </p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {extractedClaims.length === 0 ? (
            <div className="text-center text-slate-500 mt-10 text-sm">
              No claims extracted yet. Start a research topic.
            </div>
          ) : (
            extractedClaims.map((log, idx) => {
              const parsed = parseClaim(log.text);
              return (
                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">Fact #{idx + 1}</span>
                    <span className="text-xs text-slate-400 font-mono">{log.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {parsed.text}
                  </p>
                  {parsed.source && (
                    <p className="text-xs text-blue-500 mt-2 truncate">
                      📎 {parsed.source}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
    </div>
  );
}
