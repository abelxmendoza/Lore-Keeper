import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useContradictions, useVerificationStats } from '../../hooks/useVerification';
import { VerificationBadge } from '../verification/VerificationBadge';
import { VerificationDetailsModal } from '../verification/VerificationDetailsModal';
import type { EntryVerification } from '../../api/verification';

export const TruthSeekerPanel = () => {
  const { contradictions, loading, error, refresh, resolve } = useContradictions();
  const { stats } = useVerificationStats();
  const [selectedVerification, setSelectedVerification] = useState<EntryVerification | null>(null);

  const handleResolve = async (verificationId: string) => {
    try {
      await resolve(verificationId, 'Resolved by user');
    } catch (err) {
      console.error('Failed to resolve contradiction:', err);
    }
  };

  return (
    <Card className="neon-surface border border-cyan/30">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="font-techno text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-cyan-400" />
          Truth Seeker
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="text-white/60 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Verified</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{stats.verified}</p>
            </div>
            <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3">
              <div className="flex items-center gap-2 text-yellow-400">
                <HelpCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Unverified</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{stats.unverified}</p>
            </div>
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Contradicted</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{stats.contradicted}</p>
            </div>
            <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 p-3">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Ambiguous</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{stats.ambiguous}</p>
            </div>
          </div>
        )}

        {/* Contradictions List */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-white/80">
            Unresolved Contradictions ({contradictions.length})
          </h3>
          {loading && (
            <div className="py-8 text-center text-sm text-white/60">Loading contradictions...</div>
          )}
          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {!loading && !error && contradictions.length === 0 && (
            <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-400" />
              <p className="mt-2 text-sm text-green-400">No contradictions found! Your journal is consistent.</p>
            </div>
          )}
          {!loading && !error && contradictions.length > 0 && (
            <div className="space-y-3">
              {contradictions.map((verification) => (
                <div
                  key={verification.id}
                  className="rounded-lg border border-red-400/30 bg-red-400/10 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <VerificationBadge status={verification.verification_status} size="sm" showLabel />
                        {verification.entry && (
                          <span className="text-xs text-white/60">
                            {new Date(verification.entry.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {verification.entry && (
                        <p className="text-sm text-white/80 line-clamp-2 mb-2">
                          {verification.entry.summary || verification.entry.content}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-white/60">
                        <span>{verification.contradiction_count} contradiction(s)</span>
                        <span>{verification.evidence_count} supporting evidence</span>
                        <span>Confidence: {(verification.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVerification(verification)}
                        className="text-white/60 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolve(verification.id)}
                        className="text-green-400 hover:text-green-300"
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {selectedVerification && (
        <VerificationDetailsModal
          verification={selectedVerification}
          onClose={() => setSelectedVerification(null)}
        />
      )}
    </Card>
  );
};

