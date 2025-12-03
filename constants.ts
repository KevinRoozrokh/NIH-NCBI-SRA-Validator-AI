
export const INITIAL_PYTHON_SCRIPT = `import argparse
import json
import random
import time
import hashlib
import sys
from datetime import datetime

# Attempt to import NGS SDK
try:
    import ngs
    NGS_AVAILABLE = True
except ImportError:
    NGS_AVAILABLE = False

class SubmissionIntegrity:
    """
    Models a submitted dataset and handles integrity verification logic.
    """
    def __init__(self, accession_id, file_size_gb, submitter_hash, success_prob=0.8, min_phred=20.0, max_phred=38.0):
        self.accession_id = accession_id
        self.file_size_gb = file_size_gb
        self.submitter_hash = submitter_hash
        self.success_prob = success_prob
        self.min_phred = min_phred
        self.max_phred = max_phred
        self.sra_archive_hash = None
        self.integrity_verified = False
        self.average_phred_score = 0.0
        self.quality_flag = "Pending"

    def verify_integrity(self):
        """
        Simulates the generation of an archive hash.
        Randomly matches or mismatches the submitter_hash to simulate validation based on success_prob.
        """
        if random.random() < self.success_prob:
            self.sra_archive_hash = self.submitter_hash
            self.integrity_verified = True
        else:
            # Generate a mismatching hash to simulate corruption
            random_data = f"{self.accession_id}_{random.random()}"
            self.sra_archive_hash = hashlib.md5(random_data.encode()).hexdigest()
            self.integrity_verified = False
            
        return self.integrity_verified

    def calculate_quality_flag(self):
        """
        Simulates quality control check.
        Generates a random Phred score between min_phred and max_phred.
        Returns 'Low Quality Flag: Review Required' if score < 30, else 'Quality Pass'.
        """
        self.average_phred_score = random.uniform(self.min_phred, self.max_phred)
        
        if self.average_phred_score < 30:
            self.quality_flag = 'Low Quality Flag: Review Required'
        else:
            self.quality_flag = 'Quality Pass'
            
        return self.quality_flag

def calculate_costs(size_gb):
    """
    Calculate estimated costs for AWS S3 Standard vs Google BigQuery.
    """
    aws_storage_rate = 0.023
    aws_egress_rate = 0.09
    
    bq_storage_rate = 0.020
    bq_egress_rate = 0.12
    
    return {
        "aws_s3_standard": {
            "monthly_storage": round(size_gb * aws_storage_rate, 4),
            "one_time_egress": round(size_gb * aws_egress_rate, 4)
        },
        "google_bigquery": {
            "monthly_storage": round(size_gb * bq_storage_rate, 4),
            "one_time_egress": round(size_gb * bq_egress_rate, 4)
        }
    }

def estimate_project_metrics(sample_time_sec, base_count, project_size_tb):
    """
    Extrapolate processing metrics for a full metagenomic project.
    Preferably uses Base Count for more accurate estimation than file size.
    """
    # 1 TB ~ 1 Trillion bases (rough approximation for estimation if not exact)
    project_bases = project_size_tb * (10**12) 
    
    if base_count <= 0:
        return {"estimated_full_processing_time_hours": 0, "estimated_peak_cpu_core_hours": 0}
        
    # Calculate throughput: bases processed per second
    bases_per_sec = base_count / sample_time_sec
    
    if bases_per_sec == 0:
        return {"estimated_full_processing_time_hours": 0, "estimated_peak_cpu_core_hours": 0}

    total_time_seconds = project_bases / bases_per_sec
    total_time_hours = total_time_seconds / 3600
    cpu_core_hours = total_time_hours * 4 # Assuming 4 cores
    
    return {
        "estimated_full_processing_time_hours": round(total_time_hours, 2),
        "estimated_peak_cpu_core_hours": round(cpu_core_hours, 2)
    }

def get_ngs_stats(accession_id):
    """
    Uses the NCBI NGS API to retrieve real Read Count and Base Count.
    """
    if not NGS_AVAILABLE:
        print("[WARN] 'ngs' library not found. Falling back to mock stats.")
        return None, None

    try:
        print(f"[INFO] Connecting to NCBI Sequence Read Archive for {accession_id}...")
        # openRun throws if ID not found or network issues
        with ngs.openRun(accession_id) as run:
            stats = run.getStatistics()
            read_count = stats.getReadCount()
            base_count = stats.getBaseCount()
            print(f"[INFO] NGS API Success: {read_count:,} reads found.")
            return read_count, base_count
            
    except Exception as e:
        print(f"[ERROR] NGS API Query Failed: {e}")
        return None, None

def main():
    parser = argparse.ArgumentParser(description="SRA Cloud-Ops Sentinel")
    parser.add_argument("accession_id", help="SRA Accession ID")
    parser.add_argument("file_size_gb", type=float, help="File size in GB (Fallback if NGS fails)")
    parser.add_argument("--project_size_tb", type=float, default=5.0, help="Full Project Size in TB")
    parser.add_argument("--success_prob", type=float, default=0.8, help="Probability of success (0.0-1.0)")
    parser.add_argument("--min_time", type=float, default=5.0, help="Minimum validation time in seconds")
    parser.add_argument("--max_time", type=float, default=30.0, help="Maximum validation time in seconds")
    parser.add_argument("--min_phred", type=float, default=20.0, help="Minimum Phred score")
    parser.add_argument("--max_phred", type=float, default=38.0, help="Maximum Phred score")
    
    args = parser.parse_args()

    print(f"[INFO] Starting validation for {args.accession_id}...")
    
    # 1. Fetch Real Stats via NGS API
    read_count, base_count = get_ngs_stats(args.accession_id)
    
    # Fallback if NGS is missing or fails (Simulation mode)
    if read_count is None:
        # Mocking logic: 1GB ~ 15M reads, 150bp avg length
        print("[WARN] Using fallback metrics estimation based on file size.")
        read_count = int(args.file_size_gb * 15_000_000)
        base_count = int(read_count * 150)
    
    print(f"[INFO] Metrics: {read_count:,} Reads | {base_count:,} Bases")
    print(f"[INFO] Configuration: Success Prob={args.success_prob}, Time={args.min_time}-{args.max_time}s")
    
    # Simulate receiving a submitter hash
    mock_submitter_hash = hashlib.md5(f"original_{args.accession_id}".encode()).hexdigest()
    
    # Initialize Integrity Class
    submission = SubmissionIntegrity(
        args.accession_id, 
        args.file_size_gb, 
        mock_submitter_hash,
        success_prob=args.success_prob,
        min_phred=args.min_phred,
        max_phred=args.max_phred
    )

    # Cost Estimation
    print("[INFO] Calculating cloud cost estimates...")
    costs = calculate_costs(args.file_size_gb)
    
    print(f"\\n--- Estimated Cloud Costs (USD) ---")
    print(f"{'Provider':<20} {'Monthly Storage':<18} {'One-time Egress':<18}")
    print(f"{'AWS S3 Standard':<20} \${costs['aws_s3_standard']['monthly_storage']:<17.4f} \${costs['aws_s3_standard']['one_time_egress']:<17.4f}")
    print(f"{'Google BigQuery':<20} \${costs['google_bigquery']['monthly_storage']:<17.4f} \${costs['google_bigquery']['one_time_egress']:<17.4f}")
    print(f"-----------------------------------\\n")

    print("[INFO] Initializing C++ backend engine v2.4.1...")
    
    # Simulate processing time
    duration = random.uniform(args.min_time, args.max_time)
    
    steps = 10
    for i in range(steps):
        time.sleep(duration / steps)
        progress = (i + 1) * 10
        print(f"[DEBUG] Processing block {i+1}/{steps} - {progress}% complete")

    # Verify Integrity
    print(f"[INFO] Verifying checksums...")
    is_valid = submission.verify_integrity()
    
    # Quality Control
    print(f"[INFO] Running Quality Control Assessment...")
    submission.calculate_quality_flag()
    print(f"[INFO] Average Phred Score: {submission.average_phred_score:.2f}")
    
    if submission.quality_flag.startswith('Low'):
         print(f"[WARN] Quality Status: {submission.quality_flag}")
    else:
         print(f"[INFO] Quality Status: {submission.quality_flag}")

    print(f"\\n--- Integrity Report ---")
    print(f"Submitter Hash: {submission.submitter_hash}")
    print(f"Archive Hash:   {submission.sra_archive_hash}")
    
    if is_valid:
        status = "Validation Success"
        print(f"[SUCCESS] Integrity Verified. Hashes match.")
    else:
        status = "Error: Corrupt Header"
        print(f"[ERROR] Integrity Failed. Hash mismatch.")
    print(f"------------------------\\n")

    # Project Extrapolation using Base Count
    project_metrics = estimate_project_metrics(duration, base_count, args.project_size_tb)

    # Construct the SRA Sentinel Report Schema
    sentinel_report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "accession_id": args.accession_id,
        "validation_status": status,
        "file_size_gb": args.file_size_gb,
        "read_count": read_count,
        "base_count": base_count,
        "time_taken_seconds": round(duration, 2),
        "integrity_status": {
            "verified": submission.integrity_verified,
            "submitter_hash": submission.submitter_hash,
            "sra_archive_hash": submission.sra_archive_hash
        },
        "quality_assessment": {
            "quality_flag": submission.quality_flag,
            "average_phred_score": round(submission.average_phred_score, 2)
        },
        "cost_metrics_usd": costs,
        "processing_estimates": project_metrics
    }
    
    print(json.dumps(sentinel_report, indent=2))

if __name__ == "__main__":
    main()
`;
