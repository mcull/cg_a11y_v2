import { AdaptiveSampler, SamplingConfig } from '../../src/sampling/sampler';

describe('Adaptive Sampler', () => {
  const config: SamplingConfig = {
    initialSampleSize: 3,
    maxSampleSize: 10,
    consistencyThreshold: 0.8,
  };

  it('should return initial sample for small URL list', () => {
    const urls = ['url1', 'url2'];
    const sampler = new AdaptiveSampler(config);
    const sample = sampler.getInitialSample(urls);

    expect(sample).toEqual(urls);
  });

  it('should return initial sample size for large URL list', () => {
    const urls = Array.from({ length: 100 }, (_, i) => `url${i}`);
    const sampler = new AdaptiveSampler(config);
    const sample = sampler.getInitialSample(urls);

    expect(sample).toHaveLength(3);
    expect(sample).toEqual(['url0', 'url1', 'url2']);
  });

  it('should detect consistent violations', () => {
    const sampler = new AdaptiveSampler(config);

    const violations1 = ['rule1', 'rule2', 'rule3'];
    const violations2 = ['rule1', 'rule2', 'rule3'];
    const violations3 = ['rule1', 'rule2', 'rule3'];

    const isConsistent = sampler.areViolationsConsistent([
      violations1,
      violations2,
      violations3,
    ]);

    expect(isConsistent).toBe(true);
  });

  it('should detect inconsistent violations', () => {
    const sampler = new AdaptiveSampler(config);

    const violations1 = ['rule1', 'rule2', 'rule3'];
    const violations2 = ['rule1', 'rule2'];
    const violations3 = ['rule4', 'rule5'];

    const isConsistent = sampler.areViolationsConsistent([
      violations1,
      violations2,
      violations3,
    ]);

    expect(isConsistent).toBe(false);
  });

  it('should allow threshold-based consistency', () => {
    const sampler = new AdaptiveSampler(config);

    // 2 out of 3 samples have same violations = 0.67 overlap
    // With threshold 0.8, this should be inconsistent
    const violations1 = ['rule1', 'rule2'];
    const violations2 = ['rule1', 'rule2'];
    const violations3 = ['rule3', 'rule4'];

    const isConsistent = sampler.areViolationsConsistent([
      violations1,
      violations2,
      violations3,
    ]);

    expect(isConsistent).toBe(false);
  });
});
