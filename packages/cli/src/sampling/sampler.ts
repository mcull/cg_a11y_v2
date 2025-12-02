export interface SamplingConfig {
  initialSampleSize: number;
  maxSampleSize: number;
  consistencyThreshold: number; // 0-1, e.g., 0.9 = 90% overlap
}

export class AdaptiveSampler {
  private config: SamplingConfig;

  constructor(config: SamplingConfig) {
    this.config = config;
  }

  getInitialSample(urls: string[]): string[] {
    const sampleSize = Math.min(this.config.initialSampleSize, urls.length);
    return urls.slice(0, sampleSize);
  }

  getAdditionalSample(urls: string[], alreadySampled: number): string[] {
    const remaining = urls.length - alreadySampled;
    const additionalNeeded = Math.min(
      this.config.maxSampleSize - alreadySampled,
      remaining
    );

    if (additionalNeeded <= 0) {
      return [];
    }

    return urls.slice(alreadySampled, alreadySampled + additionalNeeded);
  }

  areViolationsConsistent(violationSets: string[][]): boolean {
    if (violationSets.length < 2) {
      return true;
    }

    // Calculate overlap between all sets
    const firstSet = new Set(violationSets[0]);
    let totalOverlap = 0;

    for (let i = 1; i < violationSets.length; i++) {
      const currentSet = new Set(violationSets[i]);
      const intersection = new Set([...firstSet].filter(x => currentSet.has(x)));
      const union = new Set([...firstSet, ...currentSet]);

      const overlapRatio = union.size > 0 ? intersection.size / union.size : 0;
      totalOverlap += overlapRatio;
    }

    const avgOverlap = totalOverlap / (violationSets.length - 1);
    return avgOverlap >= this.config.consistencyThreshold;
  }

  shouldContinueSampling(
    urlsCount: number,
    sampledCount: number,
    isConsistent: boolean
  ): boolean {
    // If we've sampled everything, stop
    if (sampledCount >= urlsCount) {
      return false;
    }

    // If we've reached max sample size, stop
    if (sampledCount >= this.config.maxSampleSize) {
      return false;
    }

    // If violations are consistent and we've done initial sample, stop
    if (isConsistent && sampledCount >= this.config.initialSampleSize) {
      return false;
    }

    // Otherwise, continue sampling
    return true;
  }
}
