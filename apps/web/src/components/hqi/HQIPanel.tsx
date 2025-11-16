import { useState } from 'react';
import { Filter, Search, X } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { HQIContextPayload, HQIContextSidebar } from './HQIContextSidebar';
import { HQIResult, HQIResultCard } from './HQIResultCard';

const parseListInput = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const HQIPanel = () => {
  const [query, setQuery] = useState('robotics momentum');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [tagsInput, setTagsInput] = useState('robotics');
  const [charactersInput, setCharactersInput] = useState('Kai');
  const [motifsInput, setMotifsInput] = useState('momentum');
  const [results, setResults] = useState<HQIResult[]>([]);
  const [selected, setSelected] = useState<HQIResult | null>(null);
  const [context, setContext] = useState<HQIContextPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildFilters = () => {
    const filters: Record<string, unknown> = {};
    if (timeStart) filters.time_start = timeStart;
    if (timeEnd) filters.time_end = timeEnd;
    const tags = parseListInput(tagsInput);
    const characters = parseListInput(charactersInput);
    const motifs = parseListInput(motifsInput);
    if (tags.length) filters.tags = tags;
    if (characters.length) filters.characters = characters;
    if (motifs.length) filters.motifs = motifs;
    return filters;
  };

  const fetchContext = async (nodeId: string) => {
    try {
      const response = await fetch(`/api/hqi/node/${nodeId}/context`);
      if (!response.ok) throw new Error('Failed to fetch context');
      const payload = (await response.json()) as HQIContextPayload;
      setContext(payload);
    } catch (err) {
      console.error(err);
      setContext(null);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hqi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters: buildFilters() })
      });
      const payload = await response.json();
      setResults(payload.results ?? []);
      if (payload.results?.length) {
        setSelected(payload.results[0]);
        fetchContext(payload.results[0].node_id);
      } else {
        setSelected(null);
        setContext(null);
      }
    } catch (err) {
      console.error(err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setTimeStart('');
    setTimeEnd('');
    setTagsInput('');
    setCharactersInput('');
    setMotifsInput('');
  };

  const onSelectResult = (result: HQIResult) => {
    setSelected(result);
    fetchContext(result.node_id);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border/60 bg-black/50 p-4 shadow-panel">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/50 bg-black/60 px-3 py-2">
              <Search className="h-4 w-4 text-primary" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask anything: robotics events with high emotion involving Kai"
                className="border-none bg-transparent text-white focus-visible:ring-0"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} leftIcon={<Search className="h-4 w-4" />}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-black/60 p-3">
              <div className="flex items-center gap-2 text-white/70">
                <Filter className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase">Time</p>
              </div>
              <div className="mt-2 space-y-2">
                <Input type="date" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className="bg-black/70" />
                <Input type="date" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="bg-black/70" />
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-black/60 p-3">
              <p className="text-xs uppercase text-white/70">Tags & Characters</p>
              <Input
                placeholder="tags (comma separated)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="mt-2 bg-black/70"
              />
              <Input
                placeholder="characters"
                value={charactersInput}
                onChange={(e) => setCharactersInput(e.target.value)}
                className="mt-2 bg-black/70"
              />
            </div>
            <div className="rounded-xl border border-border/50 bg-black/60 p-3">
              <p className="text-xs uppercase text-white/70">Motifs</p>
              <Input
                placeholder="motifs"
                value={motifsInput}
                onChange={(e) => setMotifsInput(e.target.value)}
                className="mt-2 bg-black/70"
              />
              <Button size="sm" variant="ghost" className="mt-2" onClick={clearFilters} leftIcon={<X className="h-3 w-3" />}>
                Clear filters
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="mt-4 space-y-3">
          {results.length === 0 && <p className="text-sm text-white/60">No results yet. Run a search to populate HQI.</p>}
          {results.map((result) => (
            <HQIResultCard key={result.node_id} result={result} selected={selected?.node_id === result.node_id} onSelect={onSelectResult} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border/60 bg-black/40 p-3">
          <p className="text-[11px] uppercase text-white/50">Active Filters</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {parseListInput(tagsInput).map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-primary/20 text-primary">
                #{tag}
              </Badge>
            ))}
            {parseListInput(charactersInput).map((character) => (
              <Badge key={character} variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                {character}
              </Badge>
            ))}
            {parseListInput(motifsInput).map((motif) => (
              <Badge key={motif} variant="secondary" className="bg-blue-500/20 text-blue-200">
                {motif}
              </Badge>
            ))}
            {!tagsInput && !charactersInput && !motifsInput && <p className="text-xs text-white/40">No filters applied.</p>}
          </div>
        </div>

        <HQIContextSidebar context={context} />
      </div>
    </div>
  );
};
