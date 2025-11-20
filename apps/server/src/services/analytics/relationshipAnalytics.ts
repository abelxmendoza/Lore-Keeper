/**
 * Relationship Analytics Module
 * Analyzes character relationships, closeness, lifecycle phases, and emotional impact
 */

import { logger } from '../../logger';
import { supabaseAdmin } from '../supabaseClient';
import { BaseAnalyticsModule } from './base';
import type { AnalyticsPayload, MemoryData, CharacterData } from './types';

interface RelationshipNode {
  id: string;
  name: string;
  degree: number;
  centrality: number;
}

interface RelationshipEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

interface LifecyclePhase {
  characterId: string;
  characterName: string;
  phase: 'rise' | 'peak' | 'drift' | 'decline';
  startDate: string;
  endDate: string | null;
  intensity: number;
}

export class RelationshipAnalyticsModule extends BaseAnalyticsModule {
  protected readonly moduleType = 'relationship_analytics' as const;

  async run(userId: string): Promise<AnalyticsPayload> {
    const cached = await this.getCachedResult(userId);
    if (cached) {
      return cached;
    }

    const memories = await this.fetchMemories(userId);
    const characters = await this.fetchCharacters(userId);

    if (memories.length === 0 || characters.length === 0) {
      return this.emptyPayload();
    }

    // Build relationship graph
    const { nodes, edges } = await this.buildRelationshipGraph(memories, characters, userId);
    
    // Compute centrality scores
    const centralityScores = this.computeCentrality(nodes, edges);
    
    // Compute closeness graph
    const closenessGraph = await this.buildClosenessGraph(characters, userId);
    
    // Detect lifecycle phases
    const lifecycle = this.detectLifecyclePhases(memories, characters);
    
    // Compute emotional impact ranking
    const emotionalImpact = this.computeEmotionalImpact(memories, characters);

    const payload: AnalyticsPayload = {
      metrics: {
        totalCharacters: characters.length,
        totalRelationships: edges.length,
        averageCloseness: closenessGraph.length > 0
          ? closenessGraph.reduce((sum, r) => sum + (r.closeness || 0), 0) / closenessGraph.length
          : 0,
        mostCentralCharacter: centralityScores.length > 0 ? centralityScores[0].name : null,
        activeRelationships: lifecycle.filter(l => l.phase === 'peak' || l.phase === 'rise').length,
      },
      charts: [
        {
          type: 'bar',
          title: 'Character Centrality',
          data: centralityScores.slice(0, 10).map(c => ({ name: c.name, centrality: c.centrality })),
          xAxis: 'name',
          yAxis: 'centrality',
        },
        {
          type: 'line',
          title: 'Relationship Lifecycle',
          data: this.formatLifecycleForChart(lifecycle),
          xAxis: 'date',
          yAxis: 'intensity',
        },
      ],
      graph: {
        nodes: nodes.map(n => ({
          id: n.id,
          label: n.name,
          type: 'character',
          metadata: { degree: n.degree, centrality: n.centrality },
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          weight: e.weight,
          type: e.type,
        })),
      },
      insights: [
        ...this.generateCentralityInsights(centralityScores),
        ...this.generateLifecycleInsights(lifecycle),
        ...this.generateEmotionalImpactInsights(emotionalImpact),
      ],
      summary: this.generateSummary(characters, edges, lifecycle, emotionalImpact),
    };

    await this.cacheResult(userId, payload);
    return payload;
  }

  /**
   * Fetch characters for user
   */
  private async fetchCharacters(userId: string): Promise<CharacterData[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('characters')
        .select('id, name, first_appearance, updated_at, interaction_score, sentiment_toward, embedding')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error({ error, userId }, 'Error fetching characters');
        return [];
      }

      return (data || []).map(char => ({
        id: char.id,
        name: char.name,
        first_seen: char.first_appearance,
        last_seen: char.updated_at,
        interaction_score: char.interaction_score,
        sentiment_toward: char.sentiment_toward,
        embedding: char.embedding as number[] | null,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Error fetching characters');
      return [];
    }
  }

  /**
   * Build relationship graph using adjacency lists
   */
  private async buildRelationshipGraph(
    memories: MemoryData[],
    characters: CharacterData[],
    userId: string
  ): Promise<{ nodes: RelationshipNode[]; edges: RelationshipEdge[] }> {
    // Get character relationships from database
    const { data: relationships, error } = await supabaseAdmin
      .from('character_relationships')
      .select('source_character_id, target_character_id, relationship_type, closeness_score')
      .eq('user_id', userId);

    if (error) {
      logger.error({ error }, 'Error fetching character relationships');
    }

    const characterMap = new Map(characters.map(c => [c.id, c]));
    const edges: RelationshipEdge[] = [];
    const nodeMap = new Map<string, RelationshipNode>();

    // Build nodes
    for (const character of characters) {
      nodeMap.set(character.id, {
        id: character.id,
        name: character.name,
        degree: 0,
        centrality: 0,
      });
    }

    // Build edges from database relationships
    if (relationships) {
      for (const rel of relationships) {
        const source = characterMap.get(rel.source_character_id);
        const target = characterMap.get(rel.target_character_id);
        
        if (source && target) {
          const weight = (rel.closeness_score || 0) / 10; // Normalize to 0-1
          edges.push({
            source: rel.source_character_id,
            target: rel.target_character_id,
            weight: Math.abs(weight),
            type: rel.relationship_type || 'unknown',
          });

          // Update degrees
          const sourceNode = nodeMap.get(rel.source_character_id);
          const targetNode = nodeMap.get(rel.target_character_id);
          if (sourceNode) sourceNode.degree++;
          if (targetNode) targetNode.degree++;
        }
      }
    }

    // Also detect co-occurrences in memories
    const coOccurrences = this.detectCoOccurrences(memories, characters);
    for (const co of coOccurrences) {
      if (!edges.find(e => 
        (e.source === co.source && e.target === co.target) ||
        (e.source === co.target && e.target === co.source)
      )) {
        edges.push(co);
        
        const sourceNode = nodeMap.get(co.source);
        const targetNode = nodeMap.get(co.target);
        if (sourceNode) sourceNode.degree++;
        if (targetNode) targetNode.degree++;
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  }

  /**
   * Detect character co-occurrences in memories
   */
  private detectCoOccurrences(
    memories: MemoryData[],
    characters: CharacterData[]
  ): RelationshipEdge[] {
    const characterNameMap = new Map(
      characters.map(c => [c.name.toLowerCase(), c.id])
    );
    const edges: RelationshipEdge[] = [];
    const coOccurrenceCounts = new Map<string, number>();

    for (const memory of memories) {
      const mentionedChars: string[] = [];
      
      // Check people array
      for (const person of memory.people || []) {
        const charId = characterNameMap.get(person.toLowerCase());
        if (charId) {
          mentionedChars.push(charId);
        }
      }

      // Also check text content for character names
      const textLower = memory.text.toLowerCase();
      for (const [name, charId] of characterNameMap.entries()) {
        if (textLower.includes(name) && !mentionedChars.includes(charId)) {
          mentionedChars.push(charId);
        }
      }

      // Count co-occurrences
      for (let i = 0; i < mentionedChars.length; i++) {
        for (let j = i + 1; j < mentionedChars.length; j++) {
          const pair = [mentionedChars[i], mentionedChars[j]].sort().join('|');
          coOccurrenceCounts.set(pair, (coOccurrenceCounts.get(pair) || 0) + 1);
        }
      }
    }

    // Create edges for significant co-occurrences (threshold: 2)
    for (const [pair, count] of coOccurrenceCounts.entries()) {
      if (count >= 2) {
        const [source, target] = pair.split('|');
        edges.push({
          source,
          target,
          weight: Math.min(1, count / 10), // Normalize
          type: 'co_occurrence',
        });
      }
    }

    return edges;
  }

  /**
   * Compute centrality scores (degree and eigenvector approximation)
   */
  private computeCentrality(
    nodes: RelationshipNode[],
    edges: RelationshipEdge[]
  ): Array<{ name: string; centrality: number }> {
    // Simple degree centrality (can be enhanced with eigenvector)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    // Compute degree centrality
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source) source.centrality += edge.weight;
      if (target) target.centrality += edge.weight;
    }

    // Normalize by max degree
    const maxCentrality = Math.max(...nodes.map(n => n.centrality), 1);
    for (const node of nodes) {
      node.centrality = node.centrality / maxCentrality;
    }

    return nodes
      .map(n => ({ name: n.name, centrality: n.centrality }))
      .sort((a, b) => b.centrality - a.centrality);
  }

  /**
   * Build closeness graph from character relationships
   */
  private async buildClosenessGraph(
    characters: CharacterData[],
    userId: string
  ): Promise<Array<{ characterId: string; characterName: string; closeness: number }>> {
    const { data: relationships, error } = await supabaseAdmin
      .from('character_relationships')
      .select('target_character_id, closeness_score')
      .eq('user_id', userId)
      .eq('source_character_id', userId) // Self-relationships
      .or('target_character_id.eq.' + userId); // Or where user is target

    if (error) {
      logger.error({ error }, 'Error fetching closeness relationships');
      return [];
    }

    const characterMap = new Map(characters.map(c => [c.id, c]));
    const closenessData: Array<{ characterId: string; characterName: string; closeness: number }> = [];

    if (relationships) {
      for (const rel of relationships) {
        const charId = rel.target_character_id || rel.source_character_id;
        const character = characterMap.get(charId);
        if (character) {
          closenessData.push({
            characterId: charId,
            characterName: character.name,
            closeness: (rel.closeness_score || 0) / 10, // Normalize to 0-1
          });
        }
      }
    }

    return closenessData.sort((a, b) => b.closeness - a.closeness);
  }

  /**
   * Detect lifecycle phases (Rise, Peak, Drift, Decline)
   */
  private detectLifecyclePhases(
    memories: MemoryData[],
    characters: CharacterData[]
  ): LifecyclePhase[] {
    const phases: LifecyclePhase[] = [];
    const characterNameMap = new Map(
      characters.map(c => [c.name.toLowerCase(), c])
    );

    for (const character of characters) {
      // Get all memories mentioning this character
      const characterMemories = memories.filter(m => {
        const people = (m.people || []).map(p => p.toLowerCase());
        const textLower = m.text.toLowerCase();
        return people.includes(character.name.toLowerCase()) ||
               textLower.includes(character.name.toLowerCase());
      });

      if (characterMemories.length < 3) {
        continue; // Not enough data
      }

      // Sort by date
      characterMemories.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Compute mention frequency over time (rolling window)
      const windowSize = Math.max(3, Math.floor(characterMemories.length / 3));
      const frequencies = this.rollingWindow(
        characterMemories,
        windowSize,
        (window) => window.length
      );

      // Detect phases based on frequency trends
      const currentPhase = this.determinePhase(frequencies);
      const startDate = characterMemories[0].created_at;
      const endDate = characterMemories[characterMemories.length - 1].created_at;
      const intensity = frequencies.length > 0
        ? frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length
        : 0;

      phases.push({
        characterId: character.id,
        characterName: character.name,
        phase: currentPhase,
        startDate,
        endDate,
        intensity: intensity / characterMemories.length, // Normalize
      });
    }

    return phases;
  }

  /**
   * Determine phase from frequency trend
   */
  private determinePhase(frequencies: number[]): 'rise' | 'peak' | 'drift' | 'decline' {
    if (frequencies.length < 2) {
      return 'drift';
    }

    const firstHalf = frequencies.slice(0, Math.floor(frequencies.length / 2));
    const secondHalf = frequencies.slice(Math.floor(frequencies.length / 2));

    const firstAvg = firstHalf.reduce((sum, f) => sum + f, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, f) => sum + f, 0) / secondHalf.length;

    const trend = secondAvg - firstAvg;
    const current = frequencies[frequencies.length - 1];
    const maxFreq = Math.max(...frequencies);

    if (trend > 0.2 && current > maxFreq * 0.8) {
      return 'peak';
    } else if (trend > 0.1) {
      return 'rise';
    } else if (trend < -0.1) {
      return 'decline';
    } else {
      return 'drift';
    }
  }

  /**
   * Compute emotional impact ranking
   */
  private computeEmotionalImpact(
    memories: MemoryData[],
    characters: CharacterData[]
  ): Array<{ characterName: string; impact: number; sentiment: number }> {
    const impactMap = new Map<string, { count: number; totalSentiment: number }>();

    for (const memory of memories) {
      const sentiment = memory.sentiment ?? 0;
      const people = memory.people || [];
      const textLower = memory.text.toLowerCase();

      for (const character of characters) {
        const mentioned = people.includes(character.name) ||
                         textLower.includes(character.name.toLowerCase());

        if (mentioned) {
          const existing = impactMap.get(character.id) || { count: 0, totalSentiment: 0 };
          impactMap.set(character.id, {
            count: existing.count + 1,
            totalSentiment: existing.totalSentiment + Math.abs(sentiment),
          });
        }
      }
    }

    return Array.from(impactMap.entries())
      .map(([charId, data]) => {
        const character = characters.find(c => c.id === charId);
        return {
          characterName: character?.name || 'Unknown',
          impact: data.count * (data.totalSentiment / data.count), // Weighted impact
          sentiment: data.totalSentiment / data.count,
        };
      })
      .sort((a, b) => b.impact - a.impact);
  }

  /**
   * Format lifecycle for chart
   */
  private formatLifecycleForChart(lifecycle: LifecyclePhase[]): Array<{ date: string; intensity: number; phase: string }> {
    return lifecycle.map(l => ({
      date: l.startDate,
      intensity: l.intensity,
      phase: l.phase,
    }));
  }

  /**
   * Generate insights
   */
  private generateCentralityInsights(
    centrality: Array<{ name: string; centrality: number }>
  ): Array<{ text: string; category: string; score: number }> {
    if (centrality.length === 0) {
      return [];
    }

    const top = centrality[0];
    return [
      {
        text: `${top.name} is the most central character in your relationship network (centrality: ${top.centrality.toFixed(2)}).`,
        category: 'relationship_centrality',
        score: top.centrality,
      },
    ];
  }

  private generateLifecycleInsights(lifecycle: LifecyclePhase[]): Array<{ text: string; category: string; score: number }> {
    const rising = lifecycle.filter(l => l.phase === 'rise').length;
    const declining = lifecycle.filter(l => l.phase === 'decline').length;

    const insights = [];
    if (rising > 0) {
      insights.push({
        text: `${rising} relationship${rising > 1 ? 's are' : ' is'} in a rising phase, showing increasing engagement.`,
        category: 'relationship_lifecycle',
        score: rising / lifecycle.length,
      });
    }
    if (declining > 0) {
      insights.push({
        text: `${declining} relationship${declining > 1 ? 's are' : ' is'} in decline, with decreasing interaction.`,
        category: 'relationship_lifecycle',
        score: declining / lifecycle.length,
      });
    }

    return insights;
  }

  private generateEmotionalImpactInsights(
    impact: Array<{ characterName: string; impact: number; sentiment: number }>
  ): Array<{ text: string; category: string; score: number }> {
    if (impact.length === 0) {
      return [];
    }

    const top = impact[0];
    return [
      {
        text: `${top.characterName} has the highest emotional impact (${top.impact.toFixed(2)}), with ${top.sentiment > 0 ? 'positive' : 'negative'} sentiment.`,
        category: 'emotional_impact',
        score: Math.abs(top.impact),
      },
    ];
  }

  private generateSummary(
    characters: CharacterData[],
    edges: RelationshipEdge[],
    lifecycle: LifecyclePhase[],
    emotionalImpact: Array<{ characterName: string; impact: number; sentiment: number }>
  ): string {
    const active = lifecycle.filter(l => l.phase === 'peak' || l.phase === 'rise').length;
    const topImpact = emotionalImpact[0];

    let summary = `Your relationship network includes ${characters.length} characters with ${edges.length} connections. `;
    summary += `${active} relationship${active !== 1 ? 's are' : ' is'} currently active or rising. `;
    
    if (topImpact) {
      summary += `${topImpact.characterName} has the strongest emotional impact in your life.`;
    }

    return summary;
  }

  private emptyPayload(): AnalyticsPayload {
    return {
      metrics: {},
      charts: [],
      graph: { nodes: [], edges: [] },
      insights: [],
      summary: 'Not enough data to generate relationship analytics.',
    };
  }
}

export const relationshipAnalyticsModule = new RelationshipAnalyticsModule();

