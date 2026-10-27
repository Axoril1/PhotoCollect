import { ProviderResult, ModerationDecision } from './moderation.types';

export class DecisionEngine {
  private autoApproveThreshold: number;
  private autoRejectThreshold: number;

  constructor() {
    // Parse thresholds from environment variables with fallback defaults
    this.autoApproveThreshold = parseFloat(process.env.AUTO_APPROVE_THRESHOLD || '0.3');
    this.autoRejectThreshold = parseFloat(process.env.AUTO_REJECT_THRESHOLD || '0.8');

    // Self-heal/validate threshold ranges to avoid logic errors
    if (isNaN(this.autoApproveThreshold) || this.autoApproveThreshold < 0 || this.autoApproveThreshold > 1) {
      this.autoApproveThreshold = 0.3;
    }
    if (isNaN(this.autoRejectThreshold) || this.autoRejectThreshold < 0 || this.autoRejectThreshold > 1) {
      this.autoRejectThreshold = 0.8;
    }
    if (this.autoApproveThreshold > this.autoRejectThreshold) {
      // Reset to default bounds if approved threshold is greater than reject threshold
      this.autoApproveThreshold = 0.3;
      this.autoRejectThreshold = 0.8;
    }
  }

  decide(results: ProviderResult[]): ModerationDecision {
    const activeResults = results.filter(r => r.status === 'success');
    if (activeResults.length === 0) {
      // If all active providers failed to execute, default to review status for safety
      return 'PENDING_REVIEW';
    }

    // Find the highest scores of sensitive categories across all active providers
    const maxAdult = Math.max(...activeResults.map(r => r.adultScore));
    const maxViolence = Math.max(...activeResults.map(r => r.violenceScore));
    const maxRacy = Math.max(...activeResults.map(r => r.racyScore));

    const maxSeverity = Math.max(maxAdult, maxViolence, maxRacy);

    if (maxSeverity >= this.autoRejectThreshold) {
      return 'REJECTED';
    }

    if (maxSeverity <= this.autoApproveThreshold) {
      return 'APPROVED';
    }

    return 'PENDING_REVIEW';
  }
}
export default DecisionEngine;
