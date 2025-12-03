import React, { useState } from 'react';
import { ScriptDisplay } from './components/ScriptDisplay';
import { Simulator } from './components/Simulator';
import { ChatInterface } from './components/ChatInterface';
import { About } from './components/About';
import { INITIAL_PYTHON_SCRIPT } from './constants';
import { SimulationConfig } from './types';

type ActiveTab = 'workbench' | 'assistant' | 'about';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workbench');
  const [script, setScript] = useState(INITIAL_PYTHON_SCRIPT);
  const [simConfig, setSimConfig] = useState<SimulationConfig>({
    accessionId: 'SRR8291023',
    fileSizeGb: 12.5,
    projectSizeTb: 5.0,
    successProbability: 0.8,
    minTimeSeconds: 5.0,
    maxTimeSeconds: 30.0,
    minPhredScore: 20.0,
    maxPhredScore: 38.0
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-brand-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                NCBI SRA <span className="text-brand-400">Validator</span> AI
              </span>
            </div>
            
            {/* Tab Navigation */}
            <div className="hidden md:flex space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              <button
                onClick={() => setActiveTab('workbench')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'workbench'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                Validator Workbench
              </button>
              <button
                onClick={() => setActiveTab('assistant')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'assistant'
                    ? 'bg-teal-600/20 text-teal-400 shadow-sm border border-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                NCBI AI Assistant
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'about'
                    ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                About
              </button>
            </div>

            <div className="text-xs text-slate-500 font-mono hidden sm:block">
              v1.2.0 • Powered by Gemini 2.5
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile Tab Select (Visible only on small screens) */}
        <div className="md:hidden mb-6">
           <div className="grid grid-cols-3 gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('workbench')}
                className={`py-2 text-center rounded text-xs font-medium ${activeTab === 'workbench' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                Workbench
              </button>
              <button
                 onClick={() => setActiveTab('assistant')}
                 className={`py-2 text-center rounded text-xs font-medium ${activeTab === 'assistant' ? 'bg-slate-700 text-teal-400' : 'text-slate-400'}`}
              >
                AI Assistant
              </button>
              <button
                 onClick={() => setActiveTab('about')}
                 className={`py-2 text-center rounded text-xs font-medium ${activeTab === 'about' ? 'bg-slate-700 text-indigo-400' : 'text-slate-400'}`}
              >
                About
              </button>
           </div>
        </div>

        {activeTab === 'workbench' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:h-[calc(100vh-8rem)] h-auto">
            {/* Left Column: Code Editor */}
            <section className="flex flex-col h-full min-h-[500px]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Generated Script</h2>
                <span className="text-xs text-slate-400">Python 3.9+</span>
              </div>
              <div className="flex-1 h-full min-h-[400px]">
                <ScriptDisplay script={script} onScriptUpdate={setScript} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                This script mocks the behavior of a C++ SRA validation tool. It accepts command line arguments and outputs JSON.
              </p>
            </section>

            {/* Right Column: Simulator */}
            <section className="flex flex-col h-full min-h-[500px]">
              <div className="mb-3 flex items-center justify-between">
                 <h2 className="text-lg font-semibold text-white">Browser Simulator</h2>
                 <span className="text-xs text-brand-400 bg-brand-900/30 px-2 py-0.5 rounded border border-brand-500/20">Interactive</span>
              </div>
              {/* Simulator container with layout management */}
              {/* Re-enabled overflow-y-auto to allow scrolling down to see Phred Analysis */}
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
                 <Simulator config={simConfig} setConfig={setSimConfig} />
              </div>
            </section>
          </div>
        ) : activeTab === 'assistant' ? (
          <div className="h-[calc(100vh-8rem)] min-h-[600px]">
             <ChatInterface />
          </div>
        ) : (
          <div className="h-[calc(100vh-8rem)] min-h-[600px]">
            <About />
          </div>
        )}
      </main>
    </div>
  );
}
