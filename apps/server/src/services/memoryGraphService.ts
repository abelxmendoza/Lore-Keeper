import crypto from 'node:crypto';

import { differenceInDays, parseISO } from 'date-fns';

import type {
  MemoryGraph,
  MemoryGraphEdge,
  MemoryGraphNode,
  MemoryGraphNodeType,
  ResolvedMemoryEntry
} from '../types';
import { memoryService } from './memoryService';

const POSITIVE_WORDS = [
  'excited',
  'happy',
  'joy',
  'grateful',
  'hopeful',
  'love',
  'proud',
  'calm',
  'confident'
];

const NEGATIVE_WORDS = [
  'sad',
  'tired',
  'anxious',
  'angry',
  'worried',
  'overwhelmed',
  'frustrated',
  'lonely',
  'guilty'
];

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'have',
  'just',
  'really',
  'about',
  'from',
  'they',
  'them',
  'today',
  'yesterday',
  'tomorrow',
  'went',
  'into',
  'onto',
  'onto',
  'still',
  'back',
  'over'
]);

const EVENT_KEYWORDS = ['party', 'meeting', 'dinner', 'call', 'trip', 'walk', 'workout', 'appointment'];
const PLACE_HINTS = ['park', 'cafe', 'office', 'home', 'school', 'apartment', 'house', 'studio'];

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

class MemoryGraphBuilder {
  private nodes = new Map<string, MemoryGraphNode>();
  private edges = new Map<string, MemoryGraphEdge>();
  private lastSentiment: number | null = null;

  ingest(entry: ResolvedMemoryEntry) {
    const content = (entry.corrected_content ?? entry.content).trim();
    const sentiment = this.scoreSentiment(content);
    const entryNode = this.ensureNode(
      'entry',
      entry.summary ?? `${content.slice(0, 80)}${content.length > 80 ? '…' : ''}`,
      entry.date,
      sentiment.score,
      content
    );

    const extracted = this.extractNodes(entry, content);
    const relatedNodes = [
      ...extracted.people,
      ...extracted.places,
      ...extracted.events,
      ...extracted.tags,
      ...extracted.themes
    ];

    const recencyWeight = this.recency(entry.date);

    relatedNodes.forEach((node) => {
      this.addEdge(entryNode.id, node.id, recencyWeight, ['context'], entry.date, sentiment.score);
    });

    this.connectCooccurrences(relatedNodes, entry.date, recencyWeight, sentiment.score);

    if (this.lastSentiment !== null && Math.abs(sentiment.score - this.lastSentiment) >= 0.4) {
      relatedNodes
        .filter((node) => node.type === 'theme' || node.type === 'tag')
        .forEach((node) => {
          this.addEdge(entryNode.id, node.id, recencyWeight * 0.5, ['sentiment shift'], entry.date, sentiment.score);
        });
    }

    this.lastSentiment = sentiment.score;
  }

  toGraph(): MemoryGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      generatedAt: new Date().toISOString(),
      entryCount: Array.from(this.nodes.values()).filter((node) => node.type === 'entry').length
    };
  }

  private ensureNode(
    type: MemoryGraphNodeType,
    label: string,
    date: string,
    sentimentScore?: number,
    contextSample?: string,
    meta?: Record<string, unknown>
  ): MemoryGraphNode {
    const normalizedLabel = label.trim();
    const id = `${type}:${slugify(normalizedLabel) || crypto.randomUUID()}`;
    const existing = this.nodes.get(id);
    const weight = this.recency(date);

    if (existing) {
      existing.weight += weight;
      existing.lastSeen = date;
      if (sentimentScore !== undefined) {
        const samples = existing.sentiments?.samples ?? [];
        const score = existing.sentiments?.score ?? 0;
        existing.sentiments = {
          score: (score * samples.length + sentimentScore) / (samples.length + 1),
          samples: contextSample ? [...samples, contextSample].slice(-3) : samples
        };
      }
      return existing;
    }

    const node: MemoryGraphNode = {
      id,
      type,
      label: normalizedLabel,
      weight,
      firstSeen: date,
      lastSeen: date,
      meta
    };

    if (sentimentScore !== undefined) {
      node.sentiments = { score: sentimentScore, samples: contextSample ? [contextSample] : [] };
    }

    this.nodes.set(id, node);
    return node;
  }

  private addEdge(
    from: string,
    to: string,
    weight: number,
    reasons: string[],
    date: string,
    sentimentImpact?: number
  ) {
    const id = `${from}->${to}`;
    const existing = this.edges.get(id);

    if (existing) {
      existing.weight += weight;
      existing.decay = this.recency(date);
      existing.lastSeen = date;
      existing.sentimentImpact = sentimentImpact ?? existing.sentimentImpact;
      existing.reasons = Array.from(new Set([...existing.reasons, ...reasons]));
      return;
    }

    const edge: MemoryGraphEdge = {
      id,
      from,
      to,
      weight,
      reasons: Array.from(new Set(reasons)),
      lastSeen: date,
      decay: this.recency(date),
      sentimentImpact
    };

    this.edges.set(id, edge);
  }

  private connectCooccurrences(
    nodes: MemoryGraphNode[],
    date: string,
    recencyWeight: number,
    sentimentScore?: number
  ) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const first = nodes[i];
        const second = nodes[j];
        const combinedReason = ['co-occurrence'];

        if (first.type === 'theme' || second.type === 'theme') {
          combinedReason.push('emotional connection');
        }

        this.addEdge(first.id, second.id, recencyWeight, combinedReason, date, sentimentScore);
        this.addEdge(second.id, first.id, recencyWeight, combinedReason, date, sentimentScore);
      }
    }
  }

  private recency(date: string) {
    const ageInDays = Math.max(0, differenceInDays(new Date(), parseISO(date)));
    const decay = Math.exp(-ageInDays / 180);
    return 0.35 + decay;
  }

  private extractNodes(entry: ResolvedMemoryEntry, content: string) {
    const people = this.extractPeople(content).map((name) => this.ensureNode('person', name, entry.date));
    const places = this.extractPlaces(content).map((place) => this.ensureNode('place', place, entry.date));
    const events = this.extractEvents(content).map((event) => this.ensureNode('event', event, entry.date));
    const tags = (entry.tags ?? []).map((tag) => this.ensureNode('tag', tag, entry.date));
    const themes = this.extractThemes(entry, content).map((theme) => this.ensureNode('theme', theme, entry.date));

    if (entry.mood) {
      themes.push(this.ensureNode('theme', entry.mood, entry.date));
    }

    return { people, places, events, tags, themes };
  }

  private extractPeople(content: string): string[] {
    const candidates = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
    return Array.from(
      new Set(
        candidates.filter((name) => name.length > 2 && !STOP_WORDS.has(name.toLowerCase())).map((name) => name.trim())
      )
    ).slice(0, 10);
  }

  private extractPlaces(content: string): string[] {
    const matches = content.match(/\b(?:in|at|from|to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g) ?? [];
    const hinted = PLACE_HINTS.flatMap((hint) =>
      (content.match(new RegExp(`\\b\\w+\\s+${hint}\\b`, 'gi')) ?? []).map((match) => match.trim())
    );
    return Array.from(new Set([...matches, ...hinted])).map((match) => match.replace(/^(in|at|from|to)\s+/i, '')).slice(0, 10);
  }

  private extractEvents(content: string): string[] {
    const lowered = content.toLowerCase();
    const events = EVENT_KEYWORDS.filter((keyword) => lowered.includes(keyword)).map((keyword) => keyword);
    const explicit = content.match(/"([^"]+)"/g)?.map((phrase) => phrase.replace(/"/g, '')) ?? [];
    return Array.from(new Set([...events, ...explicit])).slice(0, 10);
  }

  private extractThemes(entry: ResolvedMemoryEntry, content: string): string[] {
    const source = (entry.summary ?? content).toLowerCase();
    const tokens = source.match(/\b[a-z]{4,}\b/g) ?? [];
    const counts = tokens.reduce<Record<string, number>>((acc, token) => {
      if (!STOP_WORDS.has(token)) {
        acc[token] = (acc[token] ?? 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([token]) => token);
  }

  private scoreSentiment(content: string) {
    const tokens = content.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
    let score = 0;

    tokens.forEach((token) => {
      if (POSITIVE_WORDS.includes(token)) score += 1;
      if (NEGATIVE_WORDS.includes(token)) score -= 1;
    });

    const normalized = tokens.length ? score / Math.sqrt(tokens.length) : 0;

    return { score: Math.max(-1, Math.min(1, normalized)) };
  }
}

class MemoryGraphService {
  async buildGraph(userId: string): Promise<MemoryGraph> {
    const entries = await memoryService.searchEntriesWithCorrections(userId, { limit: 250 });
    const builder = new MemoryGraphBuilder();

    entries.forEach((entry) => builder.ingest(entry));

    return builder.toGraph();
  }
}

export const memoryGraphService = new MemoryGraphService();
