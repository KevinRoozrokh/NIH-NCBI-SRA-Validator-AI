import React, { useState, useEffect, useRef } from 'react';
import { SimulationConfig, LogEntry, AppState, SRASentinelReport } from '../types';
import { analyzeLogs } from '../services/geminiService';

interface SimulatorProps {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

export const Simulator: React.FC<SimulatorProps> = ({ config, setConfig }) => {
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SRASentinelReport | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fastqcUrl, setFastqcUrl] = useState<string | null>(null);
  const [isRunningFastqc, setIsRunningFastqc] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (level: LogEntry['level'], message: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      level,
      message
    }]);
  };

  const generateHash = (input: string) => {
    // Simple mock hash generation for JS simulation
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  };

  const calculateCosts = (sizeGb: number) => {
    // AWS S3 Standard
    const awsStorage = 0.023;
    const awsEgress = 0.09;
    
    // BigQuery Active Storage & GCP Egress
    const bqStorage = 0.020;
    const bqEgress = 0.12;

    return {
      aws: {
        storage: Number((sizeGb * awsStorage).toFixed(4)),
        egress: Number((sizeGb * awsEgress).toFixed(4))
      },
      gcp: {
        storage: Number((sizeGb * bqStorage).toFixed(4)),
        egress: Number((sizeGb * bqEgress).toFixed(4))
      }
    };
  };

  const calculateProjectMetrics = (timeSeconds: number, baseCount: number, projectTb: number) => {
    // 1 TB ~ 1 Trillion bases (rough approx for processing estimation)
    const projectBases = projectTb * (10 ** 12);
    
    if (baseCount <= 0 || timeSeconds <= 0) return { hours: 0, coreHours: 0 };
    
    // Throughput: Bases per second
    const basesPerSec = baseCount / timeSeconds;
    
    const totalTimeSeconds = projectBases / basesPerSec;
    const totalTimeHours = totalTimeSeconds / 3600;
    
    // Assuming 4 cores
    const cpuCoreHours = totalTimeHours * 4;
    
    return {
        hours: Number(totalTimeHours.toFixed(2)),
        coreHours: Number(cpuCoreHours.toFixed(2))
    };
  };

  const calculatePhredStats = (qScore: number) => {
    // P = 10^(-Q/10)
    const errorProb = Math.pow(10, -qScore / 10);
    const accuracy = (1 - errorProb) * 100;
    return { errorProb, accuracy };
  };

  const handleRun = () => {
    setStatus(AppState.RUNNING);
    setLogs([]);
    setProgress(0);
    setResult(null);
    setAnalysis(null);
    setFastqcUrl(null);
    setIsRunningFastqc(false);

    // MOCK NGS DATA GENERATION
    // Since we can't run real Python NGS API in browser, we simulate realistic numbers based on file size
    // Assumption: 1GB Compressed SRA ~ 15 Million Reads (Illumina paired-end simulation)
    // Read Length ~ 150bp
    const mockReadCount = Math.floor(config.fileSizeGb * 15_000_000);
    const mockBaseCount = mockReadCount * 150;

    addLog('INFO', `Starting validation for ${config.accessionId}...`);
    addLog('INFO', `Connecting to NCBI Sequence Read Archive for ${config.accessionId}...`);
    
    // Simulate network delay for API call
    setTimeout(() => {
        addLog('INFO', `NGS API Success: ${formatNumber(mockReadCount)} reads found.`);
        addLog('INFO', `Metrics: ${formatNumber(mockReadCount)} Reads | ${formatNumber(mockBaseCount)} Bases`);
        addLog('INFO', `Configuration: Success Prob=${config.successProbability}, Time=${config.minTimeSeconds}-${config.maxTimeSeconds}s, Phred=${config.minPhredScore}-${config.maxPhredScore}`);
        
        const mockSubmitterHash = generateHash(`original_${config.accessionId}`);
        addLog('INFO', `Received Submitter Hash: ${mockSubmitterHash}`);
        
        addLog('INFO', `Project context size: ${config.projectSizeTb} TB`);
        
        addLog('INFO', 'Calculating cloud cost estimates...');
        const costs = calculateCosts(config.fileSizeGb);
        
        // Visual spacer for logs
        addLog('INFO', '--- Estimated Cloud Costs (USD) ---');
        addLog('INFO', `AWS S3 Standard:    Storage $${costs.aws.storage}  / Egress $${costs.aws.egress}`);
        addLog('INFO', `Google BigQuery:    Storage $${costs.gcp.storage}  / Egress $${costs.gcp.egress}`);
        addLog('INFO', '-----------------------------------');

        addLog('INFO', 'Initializing C++ backend engine v2.4.1...');

        const totalSteps = 10;
        let currentStep = 0;
        
        // Mock processing time based on range
        const simulatedDuration = config.minTimeSeconds + Math.random() * (config.maxTimeSeconds - config.minTimeSeconds);

        const interval = setInterval(() => {
          currentStep++;
          const currentProgress = (currentStep / totalSteps) * 100;
          setProgress(currentProgress);
          
          addLog('DEBUG', `Processing block ${currentStep}/${totalSteps} - ${currentProgress}% complete`);
          
          // Random warning chance
          if (Math.random() < 0.15) {
             addLog('WARN', 'Non-critical header warning detected at offset 0x4F2A');
          }

          if (currentStep >= totalSteps) {
            clearInterval(interval);
            finishSimulation(simulatedDuration, costs, mockSubmitterHash, mockReadCount, mockBaseCount);
          }
        }, 800); // Simulate some time per step
    }, 1000); // 1 second delay for mock API
  };

  const finishSimulation = (duration: number, costs: any, submitterHash: string, readCount: number, baseCount: number) => {
    addLog('INFO', 'Verifying checksums...');
    
    const isSuccess = Math.random() < config.successProbability;
    let archiveHash = submitterHash;
    
    if (!isSuccess) {
       // Generate a mismatched hash
       archiveHash = generateHash(`corrupt_${config.accessionId}_${Math.random()}`);
    }

    // Quality Control Simulation
    addLog('INFO', 'Running Quality Control Assessment...');
    const phredScore = config.minPhredScore + Math.random() * (config.maxPhredScore - config.minPhredScore); 
    const qualityFlag = phredScore < 30 ? 'Low Quality Flag: Review Required' : 'Quality Pass';
    
    addLog('INFO', `Average Phred Score: ${phredScore.toFixed(2)}`);
    if (phredScore < 30) {
      addLog('WARN', `Quality Status: ${qualityFlag}`);
    } else {
      addLog('INFO', `Quality Status: ${qualityFlag}`);
    }

    addLog('INFO', '--- Integrity Report ---');
    addLog('INFO', `Submitter Hash: ${submitterHash}`);
    addLog('INFO', `Archive Hash:   ${archiveHash}`);

    const finalStatus = isSuccess ? "Validation Success" : "Error: Corrupt Header";
    
    if (isSuccess) {
      addLog('SUCCESS', `Integrity Verified. Hashes match.`);
      addLog('SUCCESS', `Integrity check passed for ${config.accessionId}.`);
    } else {
      addLog('ERROR', `Integrity Failed. Hash mismatch.`);
      addLog('ERROR', `Checksum mismatch in header section for ${config.accessionId}.`);
    }
    addLog('INFO', '------------------------');

    // Extrapolation
    addLog('INFO', `Extrapolating metrics for ${config.projectSizeTb} TB project using Base Count...`);
    const metrics = calculateProjectMetrics(duration, baseCount, config.projectSizeTb);
    
    addLog('INFO', '--- Project Extrapolation ---');
    addLog('INFO', `Est. Full Processing Time: ${metrics.hours} hours`);
    addLog('INFO', `Est. Peak CPU Core Hours:  ${metrics.coreHours}`);
    addLog('INFO', '-----------------------------');


    const report: SRASentinelReport = {
      timestamp: new Date().toISOString(),
      accession_id: config.accessionId,
      validation_status: finalStatus,
      file_size_gb: config.fileSizeGb,
      read_count: readCount,
      base_count: baseCount,
      time_taken_seconds: duration,
      integrity_status: {
          verified: isSuccess,
          submitter_hash: submitterHash,
          sra_archive_hash: archiveHash
      },
      quality_assessment: {
          quality_flag: qualityFlag,
          average_phred_score: Number(phredScore.toFixed(2))
      },
      cost_metrics_usd: {
        aws_s3_standard: {
          monthly_storage: costs.aws.storage,
          one_time_egress: costs.aws.egress
        },
        google_bigquery: {
          monthly_storage: costs.gcp.storage,
          one_time_egress: costs.gcp.egress
        }
      },
      processing_estimates: {
        estimated_full_processing_time_hours: metrics.hours,
        estimated_peak_cpu_core_hours: metrics.coreHours
      }
    };
    
    setResult(report);
    setStatus(AppState.COMPLETED);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const logText = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    try {
      const resultText = await analyzeLogs(logText);
      setAnalysis(resultText);
    } catch (e) {
      setAnalysis("Error analyzing logs.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunFastqc = () => {
    setIsRunningFastqc(true);
    addLog('INFO', 'Initializing FASTQC v0.11.9...');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 20;
        if (progress < 100) {
            addLog('DEBUG', `FASTQC Progress: ${progress}%`);
        } else {
            clearInterval(interval);
            addLog('SUCCESS', 'FASTQC Analysis Complete.');
            addLog('INFO', 'Generating HTML report...');
            // Mock URL pointing to the SRA Run Browser for the given accession
            const mockUrl = `https://trace.ncbi.nlm.nih.gov/Traces/sra/?run=${config.accessionId}`;
            setFastqcUrl(mockUrl);
            addLog('SUCCESS', `Report available: ${config.accessionId}_fastqc.html`);
            setIsRunningFastqc(false);
        }
    }, 500);
  };

  const renderPhredAnalysis = () => {
    if (!result) return null;
    const qScore = result.quality_assessment.average_phred_score;
    const { errorProb, accuracy } = calculatePhredStats(qScore);
    
    const isGood = qScore >= 30;

    return (
      <div className="mt-4 p-6 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm animate-fade-in shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
            Phred Quality Score (Q-Score) Analysis
        </h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed max-w-3xl">
            Based on the formula <code className="bg-slate-900 px-1.5 py-0.5 rounded text-purple-300 font-mono text-xs mx-1">Q = -10 log₁₀(P)</code>, 
            we calculate the probability that a given base call is incorrect.
        </p>

        <div className="flex flex-col gap-6">
          {/* Top Row: Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 p-5 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Average Q-Score</div>
                <div className={`text-xl lg:text-2xl font-bold font-mono ${isGood ? 'text-green-400' : 'text-yellow-400'}`}>
                  {qScore.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium">Logarithmic Scale (0-40)</div>
              </div>
              
              <div className="bg-slate-900/80 p-5 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Base Accuracy</div>
                <div className="text-xl lg:text-2xl font-bold font-mono text-blue-400">
                  {accuracy.toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium">Confidence Probability</div>
              </div>
              
              <div className="bg-slate-900/80 p-5 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all shadow-sm">
                 <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Error Probability</div>
                 <div className="text-xl lg:text-2xl font-bold font-mono text-purple-400 truncate" title={`1/${Math.round(1/errorProb)}`}>
                   1/{Math.round(1/errorProb)}
                 </div>
                 <div className="text-[10px] text-slate-500 mt-2 font-medium">Chance of Incorrect Call</div>
              </div>
          </div>
          
          {/* Middle Row: Visual Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-mono font-medium">
               <span>Q0 (Low)</span>
               <span>Q20 (99%)</span>
               <span>Q30 (99.9%)</span>
               <span>Q40 (High)</span>
            </div>
            <div className="h-4 w-full bg-slate-700/50 rounded-full overflow-hidden relative border border-slate-600/30">
               {/* Standard Markers */}
               <div className="absolute left-[50%] top-0 bottom-0 w-px bg-slate-500/30 z-10" title="Q20"></div>
               <div className="absolute left-[75%] top-0 bottom-0 w-px bg-slate-500/30 z-10" title="Q30"></div>
               
               <div 
                 className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] ${isGood ? 'bg-gradient-to-r from-green-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-yellow-400'}`}
                 style={{ width: `${Math.min((qScore / 40) * 100, 100)}%` }}
               ></div>
            </div>
          </div>

          {/* Bottom Row: Significance & Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/50">
            <div>
               <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                 <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 Significance
               </h4>
               <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-3 rounded border border-slate-700/50">
                 {isGood 
                   ? "High quality score suitable for reliable variant calling and assembly. Passes standard QC thresholds." 
                   : "Lower quality score detected. May require aggressive trimming or filtering before downstream analysis to avoid false positives."}
               </div>
            </div>
             <div>
               <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                 <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 Recommendation
               </h4>
               <ul className="space-y-2 bg-slate-900/50 p-3 rounded border border-slate-700/50">
                 {isGood ? (
                   <>
                     <li className="flex items-center gap-2 text-xs text-slate-300">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                       Proceed to alignment
                     </li>
                     <li className="flex items-center gap-2 text-xs text-slate-300">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                       Suitable for variant analysis
                     </li>
                   </>
                 ) : (
                   <>
                     <li className="flex items-center gap-2 text-xs text-slate-300">
                       <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(234,179,8,0.5)]"></span>
                       Review FASTQC reports
                     </li>
                     <li className="flex items-center gap-2 text-xs text-slate-300">
                       <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(234,179,8,0.5)]"></span>
                       Trim bases &lt; Q20
                     </li>
                   </>
                 )}
               </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Control Panel */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-brand-500 rounded-full"></span>
          Simulator Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-slate-400 text-xs font-medium mb-1">Accession ID</label>
            <input 
              type="text" 
              value={config.accessionId}
              onChange={(e) => setConfig({...config, accessionId: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none placeholder-slate-500 text-xs"
              placeholder="SRR123456"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-slate-400 text-xs font-medium mb-1">Sample Size (GB)</label>
            <input 
              type="number" 
              value={config.fileSizeGb}
              onChange={(e) => setConfig({...config, fileSizeGb: parseFloat(e.target.value) || 0})}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none placeholder-slate-500 text-xs"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-slate-400 text-xs font-medium mb-1">Project Size (TB)</label>
            <input 
              type="number" 
              value={config.projectSizeTb}
              onChange={(e) => setConfig({...config, projectSizeTb: parseFloat(e.target.value) || 0})}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none placeholder-slate-500 text-xs"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <label className="block text-slate-400 text-xs font-medium mb-1">Success Probability</label>
            <input 
              type="number"
              min="0" max="1" step="0.1" 
              value={config.successProbability}
              onChange={(e) => setConfig({...config, successProbability: parseFloat(e.target.value) || 0})}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none placeholder-slate-500 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
               <label className="block text-slate-400 text-xs font-medium mb-1">Min Time (s)</label>
               <input 
                 type="number"
                 value={config.minTimeSeconds}
                 onChange={(e) => setConfig({...config, minTimeSeconds: parseFloat(e.target.value) || 0})}
                 className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-xs"
               />
            </div>
            <div>
               <label className="block text-slate-400 text-xs font-medium mb-1">Max Time (s)</label>
               <input 
                 type="number"
                 value={config.maxTimeSeconds}
                 onChange={(e) => setConfig({...config, maxTimeSeconds: parseFloat(e.target.value) || 0})}
                 className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-xs"
               />
            </div>
            <div>
               <label className="block text-slate-400 text-xs font-medium mb-1">Min Phred</label>
               <input 
                 type="number"
                 value={config.minPhredScore}
                 onChange={(e) => setConfig({...config, minPhredScore: parseFloat(e.target.value) || 0})}
                 className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-xs"
               />
            </div>
            <div>
               <label className="block text-slate-400 text-xs font-medium mb-1">Max Phred</label>
               <input 
                 type="number"
                 value={config.maxPhredScore}
                 onChange={(e) => setConfig({...config, maxPhredScore: parseFloat(e.target.value) || 0})}
                 className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:border-brand-500 focus:outline-none text-xs"
               />
            </div>
        </div>
        
        <button
          onClick={handleRun}
          disabled={status === AppState.RUNNING || !config.accessionId}
          className={`w-full py-3 rounded-lg font-semibold transition-all ${
            status === AppState.RUNNING
              ? 'bg-slate-700 text-slate-400 cursor-wait'
              : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-900/50'
          }`}
        >
          {status === AppState.RUNNING ? 'Running Validation...' : 'Run Simulator'}
        </button>
      </div>

      {/* SRA Cloud-Ops Sentinel Dashboard */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4 animate-fade-in">
          {/* Integrity Check */}
          <div className={`p-4 rounded-xl border backdrop-blur-sm shadow-lg ${
            result.integrity_status.verified && !result.quality_assessment.quality_flag.startsWith('Low')
              ? 'bg-green-500/10 border-green-500/30 shadow-green-900/20'
              : 'bg-red-500/10 border-red-500/30 shadow-red-900/20'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-lg ${
                result.integrity_status.verified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-200">Integrity Check</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`font-mono font-bold ${result.integrity_status.verified ? 'text-green-400' : 'text-red-400'}`}>
                  {result.integrity_status.verified ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Quality</span>
                <span className={`font-mono ${!result.quality_assessment.quality_flag.startsWith('Low') ? 'text-green-400' : 'text-yellow-400'}`}>
                  {result.quality_assessment.quality_flag === 'Quality Pass' ? 'Good' : 'Review'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Phred Score</span>
                <span className="font-mono text-slate-200">{result.quality_assessment.average_phred_score}</span>
              </div>
            </div>
          </div>

          {/* Budget Check */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm shadow-lg shadow-indigo-900/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-200">Budget Check</h3>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-indigo-300/80 mb-1">For {config.projectSizeTb} TB Project</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">AWS Storage</span>
                <span className="font-mono text-slate-200">{formatCurrency(config.projectSizeTb * 1024 * 0.023)}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">One-time Egress</span>
                <span className="font-mono text-slate-200">{formatCurrency(config.projectSizeTb * 1024 * 0.09)}</span>
              </div>
               <div className="pt-2 mt-1 border-t border-indigo-500/20 flex justify-between text-xs font-medium">
                 <span className="text-indigo-300">Total 1st Month</span>
                 <span className="font-mono text-indigo-100">{formatCurrency(config.projectSizeTb * 1024 * (0.023 + 0.09))}</span>
              </div>
            </div>
          </div>

          {/* Performance Check */}
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm shadow-lg shadow-blue-900/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-200">Performance</h3>
            </div>
            <div className="space-y-2">
               <p className="text-[10px] uppercase tracking-wider text-blue-300/80 mb-1">Read Statistics</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Read Count</span>
                <span className="font-mono text-slate-200">{result.read_count ? formatNumber(result.read_count) : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Bases</span>
                <span className="font-mono text-slate-200">{result.base_count ? formatNumber(result.base_count) : 'N/A'}</span>
              </div>
              <div className="pt-2 mt-1 border-t border-blue-500/20 flex justify-between text-sm">
                 <span className="text-slate-400">Est. Compute</span>
                 <span className="font-mono text-blue-100">{formatNumber(result.processing_estimates.estimated_peak_cpu_core_hours)} core-hrs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Detailed Phred Analysis below the cards */}
      {result && (
        <div className="w-full">
          {renderPhredAnalysis()}
        </div>
      )}

      {/* Terminal Output */}
      {/* Changed: Added h-[500px] to force fixed height on stacked view (preventing page growth) */}
      {/* Changed: Added xl:h-auto xl:flex-1 to allow flexible growth on split screen view */}
      <div className="h-[500px] xl:h-auto xl:flex-1 bg-black border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="text-xs text-slate-400 font-mono">terminal — -zsh — 80x24</span>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 p-4 font-mono text-sm overflow-y-auto"
        >
          {logs.length === 0 && status === AppState.IDLE && (
            <div className="text-slate-500 text-center mt-20 italic">
              Ready to start simulation. <br/>Enter parameters above and click Run.
            </div>
          )}
          
          {logs.map((log, idx) => (
            <div key={idx} className="mb-1 whitespace-pre-wrap">
              <span className="text-slate-500">[{log.timestamp}]</span>{' '}
              <span className={`${
                log.level === 'INFO' ? 'text-blue-400' :
                log.level === 'WARN' ? 'text-yellow-400' :
                log.level === 'ERROR' ? 'text-red-500 font-bold' :
                log.level === 'SUCCESS' ? 'text-green-400 font-bold' :
                'text-slate-400'
              }`}>[{log.level}]</span>{' '}
              <span className="text-slate-200">{log.message}</span>
            </div>
          ))}

          {status === AppState.RUNNING && (
             <div className="mt-2 w-full bg-slate-800 h-1 rounded overflow-hidden">
               <div 
                  className="bg-brand-500 h-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
               ></div>
             </div>
          )}

          {result && (
            <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded text-green-300 font-mono text-xs">
              <div className="mb-1 text-slate-400">// SRA Sentinel Report (JSON)</div>
              {JSON.stringify(result, null, 2)}
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        {status === AppState.COMPLETED && (
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
             <div className="flex flex-col gap-2 w-full sm:w-auto">
                 {!fastqcUrl ? (
                     <button
                       onClick={handleRunFastqc}
                       disabled={isRunningFastqc || isAnalyzing}
                       className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded flex items-center justify-center gap-2 transition-colors border border-slate-600 w-full sm:w-auto"
                     >
                       {isRunningFastqc ? 'Running FASTQC...' : 'Run FASTQC'}
                       {!isRunningFastqc && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                     </button>
                 ) : (
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                             <button
                               onClick={handleRunFastqc}
                               disabled={isRunningFastqc || isAnalyzing}
                               className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-700"
                             >
                               Re-run
                             </button>
                             <a 
                                href={fastqcUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs bg-brand-900/50 text-brand-300 border border-brand-500/30 px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-brand-900/80 transition-colors"
                             >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                View Generated FASTQC Report
                             </a>
                        </div>
                        <span className="text-[10px] text-slate-500 ml-1">Simulated Report Link</span>
                    </div>
                 )}
             </div>
             
             <button 
               onClick={handleAnalyze}
               disabled={isAnalyzing || isRunningFastqc}
               className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
             >
               {isAnalyzing ? 'Thinking...' : 'Analyze Logs with Gemini'}
               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </button>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
             <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-300">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
             </div>
             <div>
               <h3 className="text-indigo-200 font-semibold text-sm mb-1">Gemini Analysis</h3>
               <p className="text-slate-300 text-sm leading-relaxed">{analysis}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};