import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Tag, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { MemoryCardComponent } from '../memory-explorer/MemoryCard';
import { ColorCodedTimeline } from '../timeline/ColorCodedTimeline';
import { fetchJson } from '../../lib/api';
import { memoryEntryToCard, type MemoryCard } from '../../types/memory';
import type { LocationProfile } from './LocationProfileCard';

type LocationDetailModalProps = {
  location: LocationProfile;
  onClose: () => void;
};

export const LocationDetailModal = ({ location, onClose }: LocationDetailModalProps) => {
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'people' | 'history'>('overview');

  useEffect(() => {
    const loadLocationMemories = async () => {
      if (location.entries.length === 0) return;
      
      setLoadingMemories(true);
      try {
        // Fetch full entry details for each visit
        const entryPromises = location.entries.map(async (entry) => {
          try {
            const fullEntry = await fetchJson<{
              id: string;
              date: string;
              content: string;
              summary?: string | null;
              tags: string[];
              mood?: string | null;
              chapter_id?: string | null;
              source: string;
              metadata?: Record<string, unknown>;
            }>(`/api/entries/${entry.id}`);
            return memoryEntryToCard(fullEntry);
          } catch (error) {
            console.error(`Failed to load entry ${entry.id}:`, error);
            return null;
          }
        });

        const cards = (await Promise.all(entryPromises)).filter((card): card is MemoryCard => card !== null);
        setMemoryCards(cards);
      } catch (error) {
        console.error('Failed to load location memories:', error);
      } finally {
        setLoadingMemories(false);
      }
    };
    void loadLocationMemories();
  }, [location.entries]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-black border border-border/60 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-semibold">{location.name}</h2>
              {location.coordinates && (
                <p className="text-sm text-white/60 mt-1">
                  {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex border-b border-border/60">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'visits', label: 'Visits' },
              { key: 'people', label: 'People' },
              { key: 'history', label: 'History' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-black/40 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm text-white/60">Total Visits</span>
                      </div>
                      <p className="text-2xl font-semibold text-white">{location.visitCount}</p>
                    </CardContent>
                  </Card>
                  
                  {location.firstVisited && (
                    <Card className="bg-black/40 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-white/60">First Visit</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {new Date(location.firstVisited).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {location.lastVisited && (
                    <Card className="bg-black/40 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-white/60">Last Visit</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {new Date(location.lastVisited).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="bg-black/40 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm text-white/60">People</span>
                      </div>
                      <p className="text-2xl font-semibold text-white">{location.relatedPeople.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Tags */}
                {location.tagCounts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      Top Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {location.tagCounts.map((tagCount) => (
                        <Badge
                          key={tagCount.tag}
                          variant="outline"
                          className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20"
                        >
                          {tagCount.tag} ({tagCount.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chapters */}
                {location.chapters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Chapters
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {location.chapters.map((chapter) => (
                        <Badge
                          key={chapter.id}
                          variant="outline"
                          className="px-3 py-1 text-sm bg-purple-500/10 text-purple-300 border-purple-500/20"
                        >
                          {chapter.title || 'Untitled'} ({chapter.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moods */}
                {location.moods.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Moods
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {location.moods.map((mood) => (
                        <Badge
                          key={mood.mood}
                          variant="outline"
                          className="px-3 py-1 text-sm bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                        >
                          {mood.mood} ({mood.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'visits' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Visit History ({location.entries.length})
                </h3>
                {location.entries.length === 0 ? (
                  <div className="text-center py-12 text-white/60">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium mb-1">No visits recorded</p>
                    <p className="text-sm">Visits will appear here as you mention this location in your journal entries</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {location.entries.map((entry) => (
                      <Card key={entry.id} className="bg-black/40 border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-white/50" />
                                <span className="text-sm text-white/70">
                                  {new Date(entry.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {entry.mood && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.mood}
                                  </Badge>
                                )}
                              </div>
                              {entry.summary && (
                                <p className="text-sm text-white/80 mb-2">{entry.summary}</p>
                              )}
                              {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {entry.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'people' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  People Who Visited ({location.relatedPeople.length})
                </h3>
                {location.relatedPeople.length === 0 ? (
                  <div className="text-center py-12 text-white/60">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium mb-1">No people recorded</p>
                    <p className="text-sm">People will appear here as you mention them in entries about this location</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {location.relatedPeople.map((person) => (
                      <Card key={person.id} className="bg-black/40 border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-base font-semibold text-white">{person.name}</h4>
                              <p className="text-sm text-white/60 mt-1">
                                {person.entryCount} {person.entryCount === 1 ? 'visit' : 'visits'}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                              {person.total_mentions} total mentions
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Timeline & Memories
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                      Stories and moments at {location.name}
                    </p>
                  </div>
                  {location.entries.length > 0 && (
                    <span className="text-sm text-white/50">
                      {location.entries.length} {location.entries.length === 1 ? 'memory' : 'memories'}
                    </span>
                  )}
                </div>

                {/* Timeline */}
                {memoryCards.length > 0 && (
                  <div className="border-b border-border/60 pb-6">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Timeline
                    </h4>
                    <div className="overflow-x-auto overflow-y-hidden">
                      <ColorCodedTimeline
                        entries={memoryCards.map(memory => ({
                          id: memory.id,
                          content: memory.content,
                          date: memory.date,
                          chapter_id: memory.chapterId || null
                        }))}
                        showLabel={true}
                        onItemClick={(item) => {
                          const clickedMemory = memoryCards.find(m => m.id === item.id);
                          if (clickedMemory) {
                            setExpandedCardId(expandedCardId === clickedMemory.id ? null : clickedMemory.id);
                            // Scroll to the card
                            setTimeout(() => {
                              const element = document.querySelector(`[data-memory-id="${clickedMemory.id}"]`);
                              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Memory Cards */}
                {loadingMemories ? (
                  <div className="text-center py-12 text-white/60">
                    <p>Loading memories...</p>
                  </div>
                ) : memoryCards.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Memory Cards
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {memoryCards.map((memory) => (
                        <div key={memory.id} data-memory-id={memory.id}>
                          <MemoryCardComponent
                            memory={memory}
                            showLinked={true}
                            expanded={expandedCardId === memory.id}
                            onToggleExpand={() => setExpandedCardId(expandedCardId === memory.id ? null : memory.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : location.entries.length > 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium mb-1">Loading memory details...</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium mb-1">No memories yet</p>
                    <p className="text-sm">Memories will appear here as you visit {location.name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

