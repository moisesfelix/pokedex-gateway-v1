import { ServiceMetrics } from '../types';

class Metrics {
  private metrics: ServiceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    aiErrors: 0,
    fallbacksUsed: 0,
  };

  public increment(type: keyof ServiceMetrics) {
    this.metrics[type]++;
  }

  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  public reset() {
    this.metrics = {
      totalRequests: 0, cacheHits: 0, cacheMisses: 0, aiErrors: 0, fallbacksUsed: 0
    };
  }
}

export const metrics = new Metrics();