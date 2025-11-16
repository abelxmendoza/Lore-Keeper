import { useState } from 'react';
import { BrainCircuit, Send } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

export const ChatPanel = ({
  answer,
  loading,
  persona,
  onPersonaChange,
  onRefresh,
  onAsk
}: {
  answer: string;
  loading: boolean;
  persona: string;
  onPersonaChange: (value: string) => void;
  onRefresh: () => void;
  onAsk?: (message: string) => Promise<void>;
}) => {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !onAsk) return;
    setError(null);
    try {
      await onAsk(question.trim());
      setQuestion('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to ask Lore Keeper';
      setError(errorMessage);
      console.error('Chat error:', err);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="items-center justify-between gap-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" /> Ask Lore Keeper
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <select
            value={persona}
            onChange={(event) => onPersonaChange(event.target.value)}
            className="rounded-lg border border-border/50 bg-black/60 px-3 py-2 text-xs text-white"
          >
            <option>The Archivist</option>
            <option>The Confidante</option>
            <option>Angel Negro</option>
          </select>
          {answer && (
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {onAsk && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask about your memories..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              className="flex-1 bg-black/40 border-border/50 text-white placeholder:text-white/40"
            />
            <Button type="submit" disabled={!question.trim() || loading} leftIcon={<Send className="h-4 w-4" />}>
              Ask
            </Button>
          </form>
        )}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
              {error.includes('backend') && (
                <p className="mt-2 text-xs text-red-300">
                  To start the backend, run: <code className="bg-black/30 px-1 rounded">pnpm run dev:server</code>
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-white/80 whitespace-pre-wrap">
            {loading && 'Synthesizing memory...'}
            {!loading && answer && answer}
            {!loading && !answer && !error && !onAsk && 'Ask a question to see summaries that reference your stored memories.'}
            {!loading && !answer && !error && onAsk && 'Type a question above to ask Lore Keeper about your memories.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
