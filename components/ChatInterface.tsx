import React, { useState, useRef, useEffect } from 'react';
import { Content } from '@google/genai';
import { getChatResponse } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  suggestions?: string[];
}

// Helper to handle **bold** and `code` inline
const processInlineStyles = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-700/50 text-brand-200 px-1 py-0.5 rounded text-xs font-mono border border-slate-600/50">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  // Split by code blocks first to protect them from markdown processing
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-slate-300">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Render Code Block
          const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
          const language = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          
          return (
            <div key={index} className="my-2 rounded-lg overflow-hidden border border-slate-700 bg-[#0d1117] shadow-sm group">
              {language && (
                <div className="px-3 py-1 bg-slate-800 text-[10px] text-slate-400 font-mono border-b border-slate-700 uppercase flex justify-between items-center">
                  <span>{language}</span>
                </div>
              )}
              <div className="p-3 overflow-x-auto custom-scrollbar">
                <pre className="font-mono text-xs text-blue-100 leading-relaxed">
                  {code.trim()}
                </pre>
              </div>
            </div>
          );
        }

        // Render Regular Text (processed line by line)
        const cleanPart = part.trim();
        if (!cleanPart) return null;

        return (
          <div key={index} className="space-y-2">
            {cleanPart.split('\n').map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1"></div>;

              // Header Detection
              if (trimmed.match(/^#{1,6}\s/)) {
                return (
                  <h3 key={lineIdx} className="text-sm font-bold text-white mt-4 mb-1">
                    {processInlineStyles(trimmed.replace(/^#{1,6}\s+/, ''))}
                  </h3>
                );
              }

              // List Detection
              if (trimmed.match(/^[-*]\s/)) {
                return (
                  <div key={lineIdx} className="flex gap-3 ml-1">
                    <span className="text-brand-400 mt-1.5 text-[6px] shrink-0">●</span>
                    <div className="leading-relaxed text-sm">
                      {processInlineStyles(trimmed.replace(/^[-*]\s+/, ''))}
                    </div>
                  </div>
                );
              }

              // Numbered List
              if (trimmed.match(/^\d+\.\s/)) {
                 return (
                  <div key={lineIdx} className="flex gap-2 ml-1">
                    <span className="text-brand-400 font-mono text-xs mt-0.5 shrink-0">{trimmed.match(/^\d+\./)?.[0]}</span>
                    <div className="leading-relaxed text-sm">
                      {processInlineStyles(trimmed.replace(/^\d+\.\s+/, ''))}
                    </div>
                  </div>
                 )
              }

              return (
                <p key={lineIdx} className="leading-relaxed text-sm">
                  {processInlineStyles(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your **NCBI AI Assistant**.\n\nI can help you with:\n- SRA Toolkit commands\n- Genomic data analysis\n- Python automation (`Bio.Entrez`)\n\nHow can I assist you today?",
      suggestions: ["How do I install SRA Toolkit?", "What is a FASTQ file?", "Explain Bio.Entrez usage"]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history: Content[] = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const fullResponse = await getChatResponse(history, userMessage.text);
      
      // Parse suggestions from response
      // Look for $$SUGGESTIONS$$ ["A", "B", "C"]
      const suggestionMatch = fullResponse.match(/\$\$SUGGESTIONS\$\$ (\[.*?\])/s);
      let suggestions: string[] = [];
      let cleanText = fullResponse;

      if (suggestionMatch) {
        try {
          suggestions = JSON.parse(suggestionMatch[1]);
          cleanText = fullResponse.replace(suggestionMatch[0], '').trim();
        } catch (e) {
          console.warn("Failed to parse suggestions", e);
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanText,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I apologize, but I encountered an error connecting to the knowledge base. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">NCBI AI Assistant</h2>
          <p className="text-xs text-slate-400">Powered by Gemini 3 Pro • Bioinformatics Expert</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-md ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
              ) : (
                <FormattedMessage text={msg.text} />
              )}
            </div>
            
            {/* Suggested Prompts */}
            {msg.role === 'model' && msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 max-w-[85%]">
                {msg.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    disabled={isLoading}
                    className="text-xs text-slate-300 bg-slate-800 border border-slate-600 rounded-full px-3 py-1.5 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1.5"
                  >
                    <span>{suggestion}</span>
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-5 py-4 shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about SRA tools, Bio.Entrez, or genomic data..."
            className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
            rows={1}
            style={{ minHeight: '46px', maxHeight: '150px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 bottom-1.5 p-2 rounded-lg transition-colors ${
              !input.trim() || isLoading
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-brand-500 hover:bg-brand-500/10 hover:text-brand-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-500 mt-2">
          Gemini can make mistakes. Please verify important biological data.
        </p>
      </div>
    </div>
  );
};