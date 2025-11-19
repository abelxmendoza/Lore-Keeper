import { useState, useEffect } from 'react';
import { Heart, Sparkles, Target, Shield, Zap, TrendingUp, Users, Brain, RefreshCw, Loader2, Plus, X, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { fetchJson } from '../../lib/api';
import type { EssenceProfile, EssenceInsight, SkillInsight, EvolutionEntry } from '../../types/essence';

export const SoulProfilePanel = () => {
  const [profile, setProfile] = useState<EssenceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetchJson<{ profile: EssenceProfile }>('/api/essence/profile');
      setProfile(response.profile);
    } catch (error) {
      console.error('Failed to load essence profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      await fetchJson('/api/essence/extract', { method: 'POST' });
      await loadProfile();
    } catch (error) {
      console.error('Failed to extract essence:', error);
    } finally {
      setExtracting(false);
    }
  };

  const renderEssenceCard = (
    title: string,
    icon: typeof Heart,
    items: EssenceInsight[],
    color: string
  ) => {
    if (!items || items.length === 0) {
      return (
        <Card className="bg-black/40 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {icon({ className: `h-5 w-5 ${color}` })}
              <CardTitle className="text-lg text-white">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/40">Still learning about you...</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-black/40 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon({ className: `h-5 w-5 ${color}` })}
            <CardTitle className="text-lg text-white">{title}</CardTitle>
            <Badge variant="outline" className="ml-auto text-xs">
              {items.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-black/60 border border-border/30 hover:border-primary/50 transition-colors"
              >
                <p className="text-sm text-white/90">{item.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-black/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color.replace('text-', 'bg-')}`}
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
            {items.length > 5 && (
              <p className="text-xs text-white/40 text-center pt-1">
                ...and {items.length - 5} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSkills = (skills: SkillInsight[]) => {
    if (!skills || skills.length === 0) {
      return (
        <Card className="bg-black/40 border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-lg text-white">Top Skills</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/40">Still discovering your skills...</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-black/40 border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <CardTitle className="text-lg text-white">Top Skills</CardTitle>
            <Badge variant="outline" className="ml-auto text-xs">
              {skills.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.slice(0, 10).map((skill, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-black/60 border border-border/30 hover:border-yellow-400/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{skill.skill}</span>
                  <span className="text-xs text-white/50">
                    {Math.round(skill.confidence * 100)}%
                  </span>
                </div>
                {skill.evidence && skill.evidence.length > 0 && (
                  <div className="text-xs text-white/60 mt-1">
                    <span className="text-white/40">Evidence: </span>
                    {skill.evidence.slice(0, 2).join(', ')}
                    {skill.evidence.length > 2 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEvolution = (evolution: EvolutionEntry[]) => {
    if (!evolution || evolution.length === 0) {
      return null;
    }

    return (
      <Card className="bg-black/40 border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <CardTitle className="text-lg text-white">Evolution Timeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {evolution.slice(-10).reverse().map((entry, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400 mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-white/90">{entry.changes}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/50">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.trigger}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className="bg-black/40 border-border/60">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/60">Loading your essence profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="bg-black/40 border-border/60">
        <CardHeader>
          <CardTitle className="text-xl text-white">Soul Profile</CardTitle>
          <CardDescription className="text-white/60">
            Your essence, captured and evolving
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Heart className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-4">No profile data yet</p>
          <Button onClick={handleExtract} disabled={extracting} leftIcon={extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
            {extracting ? 'Extracting...' : 'Start Capturing Your Essence'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Heart className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Soul Profile</CardTitle>
                <CardDescription className="text-white/70">
                  Your essence, hopes, dreams, fears, strengths, and skills - dynamically evolving
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtract}
              disabled={extracting}
              leftIcon={extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            >
              {extracting ? 'Extracting...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Essence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderEssenceCard('Hopes', Heart, profile.hopes || [], 'text-pink-400')}
        {renderEssenceCard('Dreams', Target, profile.dreams || [], 'text-blue-400')}
        {renderEssenceCard('Fears', Shield, profile.fears || [], 'text-red-400')}
        {renderEssenceCard('Strengths', Zap, profile.strengths || [], 'text-green-400')}
        {renderEssenceCard('Areas for Growth', TrendingUp, profile.weaknesses || [], 'text-yellow-400')}
        {renderEssenceCard('Core Values', Brain, profile.coreValues || [], 'text-purple-400')}
      </div>

      {/* Skills */}
      {renderSkills(profile.topSkills || [])}

      {/* Personality Traits */}
      {profile.personalityTraits && profile.personalityTraits.length > 0 && (
        <Card className="bg-black/40 border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <CardTitle className="text-lg text-white">Personality Traits</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.personalityTraits.slice(0, 15).map((trait, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-sm border-cyan-400/50 text-cyan-300"
                >
                  {trait.text}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationship Patterns */}
      {profile.relationshipPatterns && profile.relationshipPatterns.length > 0 && (
        <Card className="bg-black/40 border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-lg text-white">Relationship Patterns</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.relationshipPatterns.slice(0, 5).map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-black/60 border border-border/30"
                >
                  <p className="text-sm text-white/90">{pattern.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolution Timeline */}
      {renderEvolution(profile.evolution || [])}
    </div>
  );
};


