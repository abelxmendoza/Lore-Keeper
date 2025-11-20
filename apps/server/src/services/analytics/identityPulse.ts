/**
 * Identity Pulse Analytics Module
 * Tracks identity evolution, sentiment trajectory, mood volatility, and emotional triggers
 */

import { logger } from '../../logger';
import { BaseAnalyticsModule } from './base';
import type { AnalyticsPayload, MemoryData } from './types';

export class IdentityPulseModule extends BaseAnalyticsModule {
  protected readonly moduleType = 'identity_pulse' as const;

  async run(userId: string): Promise<AnalyticsPayload> {
    // Check cache first
    const cached = await this.getCachedResult(userId);
    if (cached) {
      return cached;
    }

    const memories = await this.fetchMemories(userId);
    
    if (memories.length === 0) {
      return this.emptyPayload();
    }

    // Sort by date
    memories.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Compute analytics
    const trajectory = this.computeSentimentTrajectory(memories);
    const identities = this.extractIdentityStatements(memories);
    const driftScore = await this.computeIdentityDrift(memories, userId);
    const emotionalTriggers = this.detectEmotionalTriggers(memories);
    const moodVolatility = this.computeMoodVolatility(memories);

    const payload: AnalyticsPayload = {
      metrics: {
        totalMemories: memories.length,
        driftScore: driftScore,
        moodVolatility: moodVolatility,
        identityStatements: identities.length,
        emotionalTriggers: emotionalTriggers.length,
        averageSentiment: trajectory.length > 0 
          ? trajectory.reduce((sum, p) => sum + (p.value || 0), 0) / trajectory.length 
          : 0,
      },
      charts: [
        {
          type: 'line',
          title: 'Sentiment Trajectory',
          data: trajectory,
          xAxis: 'date',
          yAxis: 'value',
        },
        {
          type: 'bar',
          title: 'Mood Distribution',
          data: this.computeMoodDistribution(memories),
          xAxis: 'mood',
          yAxis: 'count',
        },
      ],
      insights: [
        ...this.generateDriftInsights(driftScore),
        ...this.generateVolatilityInsights(moodVolatility),
        ...this.generateTriggerInsights(emotionalTriggers),
      ],
      summary: this.generateSummary(trajectory, driftScore, moodVolatility, identities),
    };

    // Cache result
    await this.cacheResult(userId, payload);

    return payload;
  }

  /**
   * Compute sentiment trajectory using EMA smoothing
   */
  private computeSentimentTrajectory(memories: MemoryData[]): Array<{ date: string; value: number }> {
    // Extract sentiment values (default to 0 if null)
    const sentiments = memories.map(m => m.sentiment ?? 0);
    
    // Apply EMA smoothing (alpha = 0.3)
    const smoothed = this.ema(sentiments, 0.3);

    return memories.map((memory, i) => ({
      date: memory.created_at,
      value: smoothed[i],
    }));
  }

  /**
   * Extract identity statements using regex patterns
   */
  private extractIdentityStatements(memories: MemoryData[]): Array<{ text: string; date: string; confidence: number }> {
    const identityPatterns = [
      /I am\s+([^.!?]+)/gi,
      /I'm\s+([^.!?]+)/gi,
      /I feel\s+like\s+I\s+am\s+([^.!?]+)/gi,
      /I see myself as\s+([^.!?]+)/gi,
      /I consider myself\s+([^.!?]+)/gi,
      /I identify as\s+([^.!?]+)/gi,
      /I think of myself as\s+([^.!?]+)/gi,
      /my identity\s+is\s+([^.!?]+)/gi,
      /who I am\s+is\s+([^.!?]+)/gi,
      /I believe I am\s+([^.!?]+)/gi,
    ];

    const statements: Array<{ text: string; date: string; confidence: number }> = [];

    for (const memory of memories) {
      for (const pattern of identityPatterns) {
        const matches = memory.text.matchAll(pattern);
        for (const match of matches) {
          const statement = match[1]?.trim();
          if (statement && statement.length > 5 && statement.length < 200) {
            statements.push({
              text: statement,
              date: memory.created_at,
              confidence: 0.8, // Base confidence, could be enhanced
            });
          }
        }
      }
    }

    return statements;
  }

  /**
   * Compute identity drift via centroid shift
   */
  private async computeIdentityDrift(memories: MemoryData[], userId: string): Promise<number> {
    if (memories.length < 10) {
      return 0; // Not enough data
    }

    // Split into recent (last 30 days) and historical (before that)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recent = memories.filter(m => new Date(m.created_at) >= thirtyDaysAgo);
    const historical = memories.filter(m => new Date(m.created_at) < thirtyDaysAgo);

    if (recent.length === 0 || historical.length === 0) {
      return 0;
    }

    // Get identity statements for each period
    const recentIdentities = this.extractIdentityStatements(recent);
    const historicalIdentities = this.extractIdentityStatements(historical);

    if (recentIdentities.length === 0 || historicalIdentities.length === 0) {
      return 0;
    }

    // For identity statements with embeddings, compute centroids
    // For now, use a simplified approach: compare statement similarity
    const recentTexts = recentIdentities.map(i => i.text.toLowerCase());
    const historicalTexts = historicalIdentities.map(i => i.text.toLowerCase());

    // Simple overlap-based drift score
    const overlap = recentTexts.filter(t => historicalTexts.includes(t)).length;
    const totalUnique = new Set([...recentTexts, ...historicalTexts]).size;
    
    // Drift score: 0 = no drift, 1 = complete drift
    const driftScore = totalUnique > 0 ? 1 - (overlap / totalUnique) : 0;

    return Math.min(1, Math.max(0, driftScore));
  }

  /**
   * Detect emotional triggers (events that cause strong sentiment shifts)
   */
  private detectEmotionalTriggers(memories: MemoryData[]): Array<{ text: string; date: string; impact: number }> {
    if (memories.length < 3) {
      return [];
    }

    const triggers: Array<{ text: string; date: string; impact: number }> = [];
    const sentiments = memories.map(m => m.sentiment ?? 0);

    // Detect significant sentiment shifts
    for (let i = 1; i < memories.length; i++) {
      const prevSentiment = sentiments[i - 1];
      const currSentiment = sentiments[i];
      const shift = Math.abs(currSentiment - prevSentiment);

      // Significant shift threshold
      if (shift > 0.5) {
        triggers.push({
          text: memories[i].text.substring(0, 200), // First 200 chars
          date: memories[i].created_at,
          impact: shift,
        });
      }
    }

    // Sort by impact
    triggers.sort((a, b) => b.impact - a.impact);

    return triggers.slice(0, 10); // Top 10 triggers
  }

  /**
   * Compute mood volatility using rolling standard deviation
   */
  private computeMoodVolatility(memories: MemoryData[]): number {
    const moods = memories
      .filter(m => m.mood)
      .map(m => {
        // Convert mood text to numeric (simplified)
        const moodMap: Record<string, number> = {
          'very_positive': 1.0,
          'positive': 0.5,
          'neutral': 0.0,
          'negative': -0.5,
          'very_negative': -1.0,
        };
        return moodMap[m.mood!.toLowerCase()] ?? 0;
      });

    if (moods.length < 2) {
      return 0;
    }

    // Use rolling window standard deviation
    const windowSize = Math.min(14, Math.floor(moods.length / 2));
    const rollingStdDev = this.rollingWindow(moods, windowSize, (window) => 
      this.standardDeviation(window)
    );

    // Average volatility
    return rollingStdDev.length > 0
      ? rollingStdDev.reduce((sum, val) => sum + val, 0) / rollingStdDev.length
      : 0;
  }

  /**
   * Compute mood distribution
   */
  private computeMoodDistribution(memories: MemoryData[]): Array<{ mood: string; count: number }> {
    const moodCounts = new Map<string, number>();
    
    for (const memory of memories) {
      if (memory.mood) {
        moodCounts.set(memory.mood, (moodCounts.get(memory.mood) || 0) + 1);
      }
    }

    return Array.from(moodCounts.entries())
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate drift insights
   */
  private generateDriftInsights(driftScore: number): Array<{ text: string; category: string; score: number }> {
    const insights = [];
    
    if (driftScore > 0.7) {
      insights.push({
        text: `Significant identity shift detected (${(driftScore * 100).toFixed(0)}% drift). Your self-perception has changed substantially.`,
        category: 'identity_drift',
        score: driftScore,
      });
    } else if (driftScore > 0.4) {
      insights.push({
        text: `Moderate identity evolution (${(driftScore * 100).toFixed(0)}% drift). You're exploring new aspects of yourself.`,
        category: 'identity_drift',
        score: driftScore,
      });
    } else {
      insights.push({
        text: `Stable identity (${(driftScore * 100).toFixed(0)}% drift). Your core self-perception remains consistent.`,
        category: 'identity_drift',
        score: driftScore,
      });
    }

    return insights;
  }

  /**
   * Generate volatility insights
   */
  private generateVolatilityInsights(volatility: number): Array<{ text: string; category: string; score: number }> {
    const insights = [];
    
    if (volatility > 0.7) {
      insights.push({
        text: `High mood volatility detected. Your emotional state fluctuates significantly, which may indicate stress or transition.`,
        category: 'mood_volatility',
        score: volatility,
      });
    } else if (volatility > 0.4) {
      insights.push({
        text: `Moderate mood variability. Your emotions show natural variation over time.`,
        category: 'mood_volatility',
        score: volatility,
      });
    } else {
      insights.push({
        text: `Stable mood patterns. Your emotional state remains relatively consistent.`,
        category: 'mood_volatility',
        score: volatility,
      });
    }

    return insights;
  }

  /**
   * Generate trigger insights
   */
  private generateTriggerInsights(triggers: Array<{ text: string; date: string; impact: number }>): Array<{ text: string; category: string; score: number }> {
    if (triggers.length === 0) {
      return [];
    }

    return [
      {
        text: `Detected ${triggers.length} significant emotional triggers. These events caused major shifts in your sentiment.`,
        category: 'emotional_triggers',
        score: triggers.reduce((sum, t) => sum + t.impact, 0) / triggers.length,
      },
    ];
  }

  /**
   * Generate summary
   */
  private generateSummary(
    trajectory: Array<{ date: string; value: number }>,
    driftScore: number,
    volatility: number,
    identities: Array<{ text: string; date: string; confidence: number }>
  ): string {
    const avgSentiment = trajectory.length > 0
      ? trajectory.reduce((sum, p) => sum + p.value, 0) / trajectory.length
      : 0;

    const sentimentTrend = trajectory.length >= 2
      ? trajectory[trajectory.length - 1].value - trajectory[0].value
      : 0;

    let summary = `Your identity pulse shows `;
    
    if (driftScore > 0.6) {
      summary += `significant evolution with ${identities.length} identity statements captured. `;
    } else {
      summary += `stable self-perception with ${identities.length} identity statements. `;
    }

    if (avgSentiment > 0.3) {
      summary += `Overall sentiment is positive (${avgSentiment.toFixed(2)}). `;
    } else if (avgSentiment < -0.3) {
      summary += `Overall sentiment is negative (${avgSentiment.toFixed(2)}). `;
    } else {
      summary += `Overall sentiment is neutral (${avgSentiment.toFixed(2)}). `;
    }

    if (sentimentTrend > 0.2) {
      summary += `Sentiment is trending upward, indicating positive momentum.`;
    } else if (sentimentTrend < -0.2) {
      summary += `Sentiment is trending downward, which may require attention.`;
    } else {
      summary += `Sentiment remains relatively stable over time.`;
    }

    if (volatility > 0.6) {
      summary += ` High mood volatility suggests you're in a period of transition or stress.`;
    }

    return summary;
  }

  private emptyPayload(): AnalyticsPayload {
    return {
      metrics: {},
      charts: [],
      insights: [],
      summary: 'Not enough data to generate identity pulse analytics.',
    };
  }
}

export const identityPulseModule = new IdentityPulseModule();

