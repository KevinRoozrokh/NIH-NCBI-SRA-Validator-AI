import React, { useState } from 'react';
import { customizeScript } from '../services/geminiService';

interface ScriptDisplayProps {
  script: string;
  onScriptUpdate: (newScript: string) => void;
}

export const ScriptDisplay: React.FC<ScriptDisplayProps> = ({ script, onScriptUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomize = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const newScript = await customizeScript(script, prompt);
      onScriptUpdate(newScript);
      setPrompt('');
    } catch (error) {
      console.error(error);
      alert('Failed to customize script. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-mono font-semibold text-slate-200 text-sm">sra_validator.py</span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <span className="text-green-400">Copied!</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        <textarea
          value={script}
          readOnly
          className="w-full h-full p-4 bg-[#0d1117] text-slate-300 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-slate-700"
          spellCheck={false}
        />
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Ask Gemini to modify the script:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add a checksum verification step..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCustomize()}
          />
          <button
            onClick={handleCustomize}
            disabled={isLoading || !prompt}
            className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-all ${
              isLoading || !prompt
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg hover:shadow-brand-500/25'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
              </svg>
            )}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};