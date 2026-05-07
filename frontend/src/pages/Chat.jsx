import { useState, useRef, useEffect } from 'react';
import api from '../api/client.js';

/** Simple markdown-ish renderer for chat messages */
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/## (.+)/g, '<h3 style="margin:0.5rem 0 0.25rem;font-size:1.05rem;font-weight:700">$1</h3>')
    .replace(/### (.+)/g, '<h4 style="margin:0.4rem 0 0.2rem;font-size:0.95rem;font-weight:600">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em style="color:var(--text-muted)">$1</em>')
    .replace(/\n- /g, '\n• ')
    .replace(/\| (.+?) \| (.+?) \|/g, '<div style="display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-secondary);text-transform:capitalize">$1</span><span>$2</span></div>')
    .replace(/\n/g, '<br/>');
}

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', content: "👋 Hi! I'm your **ITIS onboarding assistant**, powered by AI.\n\nI can help with:\n- 📖 **Company policies** — benefits, leave, HR rules\n- 📋 **Onboarding checklists** — track your progress\n- ⏰ **Reminders** — set deadline notifications\n- ✅ **Tasks** — create action items\n- 📊 **Team metrics** — performance data\n\nTry asking: _What is the leave policy?_" }
  ]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      const data = await api.sendMessage(text, threadId);
      if (!threadId) setThreadId(data.thread_id);
      setMessages(prev => [...prev, {
        id: data.message.id,
        role: 'assistant',
        content: data.message.content,
        intent: data.message.intent,
        confidence: data.message.confidence,
        worker: data.message.worker,
        citations: data.message.citations
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: '❌ Sorry, something went wrong. Please try again.'
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { label: '📋 My checklist', msg: 'Show my onboarding checklist progress' },
    { label: '📖 Leave policy', msg: 'What is the PTO and leave policy?' },
    { label: '💊 Health benefits', msg: 'What health insurance benefits do we have?' },
    { label: '⏰ Set reminder', msg: 'Remind me to complete security training by Friday' },
    { label: '📊 Team metrics', msg: 'Show team velocity and cycle time metrics' },
    { label: '🏢 401k plan', msg: 'What is the 401k matching policy?' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">AI Assistant</h1>
        <p className="page-subtitle">Ask questions, track onboarding, manage tasks — powered by Gemini + OpenClaw</p>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              {msg.worker && (
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>🤖 {msg.worker}</span>
                  {msg.intent && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>🎯 {msg.intent.replace(/_/g, ' ')}</span>}
                  {msg.confidence && <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>💡 {Math.round(msg.confidence * 100)}%</span>}
                </div>
              )}
              {msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  📎 <strong>Sources:</strong> {msg.citations.join(' · ')}
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="chat-bubble assistant">
              <div className="animate-pulse" style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem' }}>🧠</span>
                <span style={{ color: 'var(--text-muted)' }}>Thinking with Gemini…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          {quickActions.map((qa, i) => (
            <button key={i} className="btn btn-secondary btn-sm"
              onClick={() => { setInput(qa.msg); }}
              style={{ fontSize: '0.7rem' }}>
              {qa.label}
            </button>
          ))}
        </div>

        <div className="chat-input-area">
          <input className="chat-input" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="Ask about policies, benefits, onboarding, or team metrics…"
            disabled={sending} />
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !input.trim()}
            style={{ borderRadius: 'var(--radius-full)', width: '44px', height: '44px', padding: 0, justifyContent: 'center' }}>
            {sending ? '…' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}
