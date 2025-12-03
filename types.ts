
export interface SimulationConfig {
  accessionId: string;
  fileSizeGb: number;
  projectSizeTb: number;
  successProbability: number; // 0.0 to 1.0
  minTimeSeconds: number;
  maxTimeSeconds: number;
  minPhredScore: number;
  maxPhredScore: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
  message: string;
}

export interface CostBreakdown {
  monthly_storage: number;
  one_time_egress: number;
}

export interface ProjectEstimates {
  estimated_full_processing_time_hours: number;
  estimated_peak_cpu_core_hours: number;
}

export interface CloudCostMetrics {
  aws_s3_standard: CostBreakdown;
  google_bigquery: CostBreakdown;
}

export interface IntegrityStatus {
  verified: boolean;
  submitter_hash: string;
  sra_archive_hash: string;
}

export interface QualityAssessment {
  quality_flag: string;
  average_phred_score: number;
}

export interface ProcessingEstimates {
  estimated_full_processing_time_hours: number;
  estimated_peak_cpu_core_hours: number;
}

export interface SRASentinelReport {
  timestamp: string;
  accession_id: string;
  validation_status: string;
  file_size_gb: number;
  read_count?: number;
  base_count?: number;
  time_taken_seconds: number;
  integrity_status: IntegrityStatus;
  quality_assessment: QualityAssessment;
  cost_metrics_usd: CloudCostMetrics;
  processing_estimates: ProcessingEstimates;
}

export interface ValidationResult {
  accession_id: string;
  validation_status: string;
  time_taken_seconds: number;
  submitter_hash?: string;
  sra_archive_hash?: string;
  integrity_verified?: boolean;
  average_phred_score?: number;
  quality_status?: string;
  estimated_costs_usd?: {
    aws_s3_standard: CostBreakdown;
    google_bigquery: CostBreakdown;
  };
  project_estimates?: ProjectEstimates;
}

export enum AppState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
}
