import { logger } from '../logger';
import { memoryService } from './memoryService';
import { factExtractionService, type ExtractedFact } from './factExtractionService';
import { supabaseAdmin } from './supabaseClient';
import type { MemoryEntry } from '../types';

export type VerificationStatus = 'verified' | 'unverified' | 'contradicted' | 'ambiguous';

export type EvidenceEntry = {
  entry_id: string;
  entry_date: string;
  content_snippet: string;
  similarity_score?: number;
};

export type VerificationResult = {
  status: VerificationStatus;
  confidence_score: number;
  evidence_count: number;
  contradiction_count: number;
  supporting_entries: EvidenceEntry[];
  contradicting_entries: EvidenceEntry[];
  extracted_facts: ExtractedFact[];
  verification_report: {
    facts_checked: number;
    facts_verified: number;
    facts_contradicted: number;
    facts_unverified: number;
    details: Array<{
      fact: ExtractedFact;
      status: VerificationStatus;
      evidence?: EvidenceEntry[];
      contradictions?: EvidenceEntry[];
    }>;
  };
};

class TruthVerificationService {
  /**
   * Verify an entry against existing canonical facts and related entries
   */
  async verifyEntry(userId: string, entryId: string, entry: MemoryEntry): Promise<VerificationResult> {
    try {
      // Extract facts from the entry
      const extractionResult = await factExtractionService.extractFacts(entry.content);
      const extractedFacts = extractionResult.facts;

      if (extractedFacts.length === 0) {
        return {
          status: 'unverified',
          confidence_score: 0.5,
          evidence_count: 0,
          contradiction_count: 0,
          supporting_entries: [],
          contradicting_entries: [],
          extracted_facts: [],
          verification_report: {
            facts_checked: 0,
            facts_verified: 0,
            facts_contradicted: 0,
            facts_unverified: 0,
            details: []
          }
        };
      }

      // Get related entries for comparison
      const relatedEntries = await this.findRelatedEntries(userId, entry, extractedFacts);

      // Verify each fact
      const factVerifications = await Promise.all(
        extractedFacts.map(fact => this.verifyFact(userId, fact, relatedEntries, entryId))
      );

      // Aggregate results
      const verifiedCount = factVerifications.filter(v => v.status === 'verified').length;
      const contradictedCount = factVerifications.filter(v => v.status === 'contradicted').length;
      const ambiguousCount = factVerifications.filter(v => v.status === 'ambiguous').length;

      // Determine overall status
      let overallStatus: VerificationStatus = 'unverified';
      if (contradictedCount > 0) {
        overallStatus = 'contradicted';
      } else if (ambiguousCount > 0 && verifiedCount === 0) {
        overallStatus = 'ambiguous';
      } else if (verifiedCount > 0) {
        overallStatus = 'verified';
      }

      // Collect all supporting and contradicting entries
      const supportingEntries = new Map<string, EvidenceEntry>();
      const contradictingEntries = new Map<string, EvidenceEntry>();

      factVerifications.forEach(verification => {
        verification.evidence?.forEach(evidence => {
          supportingEntries.set(evidence.entry_id, evidence);
        });
        verification.contradictions?.forEach(contradiction => {
          contradictingEntries.set(contradiction.entry_id, contradiction);
        });
      });

      const confidenceScore = this.calculateConfidenceScore(factVerifications, extractedFacts.length);

      return {
        status: overallStatus,
        confidence_score: confidenceScore,
        evidence_count: supportingEntries.size,
        contradiction_count: contradictingEntries.size,
        supporting_entries: Array.from(supportingEntries.values()),
        contradicting_entries: Array.from(contradictingEntries.values()),
        extracted_facts: extractedFacts,
        verification_report: {
          facts_checked: extractedFacts.length,
          facts_verified: verifiedCount,
          facts_contradicted: contradictedCount,
          facts_unverified: extractedFacts.length - verifiedCount - contradictedCount - ambiguousCount,
          details: factVerifications.map((v, i) => ({
            fact: extractedFacts[i],
            status: v.status,
            evidence: v.evidence,
            contradictions: v.contradictions
          }))
        }
      };
    } catch (error) {
      logger.error({ error, entryId }, 'Failed to verify entry');
      return {
        status: 'unverified',
        confidence_score: 0,
        evidence_count: 0,
        contradiction_count: 0,
        supporting_entries: [],
        contradicting_entries: [],
        extracted_facts: [],
        verification_report: {
          facts_checked: 0,
          facts_verified: 0,
          facts_contradicted: 0,
          facts_unverified: 0,
          details: []
        }
      };
    }
  }

  /**
   * Verify a single fact against related entries
   */
  private async verifyFact(
    userId: string,
    fact: ExtractedFact,
    relatedEntries: MemoryEntry[],
    currentEntryId: string
  ): Promise<{
    status: VerificationStatus;
    evidence?: EvidenceEntry[];
    contradictions?: EvidenceEntry[];
  }> {
    const evidence: EvidenceEntry[] = [];
    const contradictions: EvidenceEntry[] = [];

    // Check against related entries
    for (const entry of relatedEntries) {
      if (entry.id === currentEntryId) continue;

      // Extract facts from related entry
      const relatedFacts = await factExtractionService.extractFacts(entry.content);
      
      // Check for matching facts (supporting evidence)
      const matchingFacts = relatedFacts.facts.filter(
        f => f.subject.toLowerCase() === fact.subject.toLowerCase() &&
             f.attribute.toLowerCase() === fact.attribute.toLowerCase() &&
             this.valuesMatch(f.value, fact.value)
      );

      if (matchingFacts.length > 0) {
        evidence.push({
          entry_id: entry.id,
          entry_date: entry.date,
          content_snippet: entry.content.substring(0, 200),
          similarity_score: matchingFacts[0].confidence
        });
      }

      // Check for contradicting facts
      const contradictingFacts = relatedFacts.facts.filter(
        f => f.subject.toLowerCase() === fact.subject.toLowerCase() &&
             f.attribute.toLowerCase() === fact.attribute.toLowerCase() &&
             !this.valuesMatch(f.value, fact.value)
      );

      if (contradictingFacts.length > 0) {
        contradictions.push({
          entry_id: entry.id,
          entry_date: entry.date,
          content_snippet: entry.content.substring(0, 200),
          similarity_score: contradictingFacts[0].confidence
        });
      }
    }

    // Determine status
    let status: VerificationStatus = 'unverified';
    if (contradictions.length > 0 && evidence.length === 0) {
      status = 'contradicted';
    } else if (contradictions.length > 0 && evidence.length > 0) {
      status = 'ambiguous';
    } else if (evidence.length > 0) {
      status = 'verified';
    }

    return {
      status,
      evidence: evidence.length > 0 ? evidence : undefined,
      contradictions: contradictions.length > 0 ? contradictions : undefined
    };
  }

  /**
   * Find related entries for comparison
   */
  private async findRelatedEntries(
    userId: string,
    entry: MemoryEntry,
    extractedFacts: ExtractedFact[]
  ): Promise<MemoryEntry[]> {
    try {
      // Get entries from similar time period (±30 days)
      const entryDate = new Date(entry.date);
      const fromDate = new Date(entryDate);
      fromDate.setDate(fromDate.getDate() - 30);
      const toDate = new Date(entryDate);
      toDate.setDate(toDate.getDate() + 30);

      const relatedEntries = await memoryService.searchEntries(userId, {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        limit: 50
      });

      // Also search for entries mentioning the same subjects
      const subjects = new Set(extractedFacts.map(f => f.subject.toLowerCase()));
      const subjectEntries = await Promise.all(
        Array.from(subjects).slice(0, 5).map(subject =>
          memoryService.searchEntries(userId, {
            search: subject,
            limit: 20
          })
        )
      );

      // Combine and deduplicate
      const allEntries = [...relatedEntries, ...subjectEntries.flat()];
      const uniqueEntries = new Map<string, MemoryEntry>();
      allEntries.forEach(e => {
        if (e.id !== entry.id) {
          uniqueEntries.set(e.id, e);
        }
      });

      return Array.from(uniqueEntries.values()).slice(0, 50);
    } catch (error) {
      logger.error({ error }, 'Failed to find related entries');
      return [];
    }
  }

  /**
   * Check if two fact values match (with fuzzy matching for dates/locations)
   */
  private valuesMatch(value1: string, value2: string): boolean {
    const v1 = value1.toLowerCase().trim();
    const v2 = value2.toLowerCase().trim();

    // Exact match
    if (v1 === v2) return true;

    // Date matching (allow some flexibility)
    if (this.isDate(v1) && this.isDate(v2)) {
      const d1 = new Date(v1);
      const d2 = new Date(v2);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const daysDiff = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 1; // Allow 1 day difference
      }
    }

    // Location matching (fuzzy)
    if (v1.includes(v2) || v2.includes(v1)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a string looks like a date
   */
  private isDate(str: string): boolean {
    return !isNaN(Date.parse(str));
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidenceScore(
    verifications: Array<{ status: VerificationStatus }>,
    totalFacts: number
  ): number {
    if (totalFacts === 0) return 0;

    let score = 0;
    verifications.forEach(v => {
      switch (v.status) {
        case 'verified':
          score += 1;
          break;
        case 'unverified':
          score += 0.5;
          break;
        case 'ambiguous':
          score += 0.3;
          break;
        case 'contradicted':
          score += 0;
          break;
      }
    });

    return score / totalFacts;
  }

  /**
   * Store verification result in database
   */
  async storeVerification(
    userId: string,
    entryId: string,
    result: VerificationResult
  ): Promise<void> {
    try {
      // Store fact claims
      if (result.extracted_facts.length > 0) {
        const factClaims = result.extracted_facts.map(fact => ({
          user_id: userId,
          entry_id: entryId,
          claim_type: fact.claim_type,
          subject: fact.subject,
          attribute: fact.attribute,
          value: fact.value,
          confidence: fact.confidence,
          metadata: { context: fact.context }
        }));

        await supabaseAdmin.from('fact_claims').upsert(factClaims, {
          onConflict: 'user_id,entry_id,subject,attribute,value'
        });
      }

      // Store entry verification
      await supabaseAdmin.from('entry_verifications').upsert({
        user_id: userId,
        entry_id: entryId,
        verification_status: result.status,
        verified_by: 'system',
        confidence_score: result.confidence_score,
        evidence_count: result.evidence_count,
        contradiction_count: result.contradiction_count,
        supporting_entries: result.supporting_entries.map(e => e.entry_id),
        contradicting_entries: result.contradicting_entries.map(e => e.entry_id),
        verification_report: result.verification_report,
        resolved: false
      }, {
        onConflict: 'user_id,entry_id'
      });

      // Update entry verification status
      await supabaseAdmin
        .from('journal_entries')
        .update({ verification_status: result.status })
        .eq('id', entryId)
        .eq('user_id', userId);
    } catch (error) {
      logger.error({ error, entryId }, 'Failed to store verification result');
    }
  }
}

export const truthVerificationService = new TruthVerificationService();

