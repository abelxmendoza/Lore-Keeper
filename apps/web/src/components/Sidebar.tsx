import { BookMarked, CalendarDays, MessageSquareText, Plus, Sparkles } from 'lucide-react';

import { Logo } from './Logo';
import { Button } from './ui/button';

interface SidebarProps {
  activeTab?: 'log' | 'timeline';
  onTabChange?: (tab: 'log' | 'timeline') => void;
  onCreateChapter?: () => void;
  onScrollToComposer?: () => void;
}

export const Sidebar = ({ activeTab, onTabChange, onCreateChapter, onScrollToComposer }: SidebarProps) => (
  <aside className="hidden w-64 flex-col border-r border-border/60 bg-black/20 p-6 text-white lg:flex">
    <div className="mb-6">
      <Logo size="lg" showText={true} />
      <p className="mt-4 text-xs text-white/50">Cyberpunk journal with GPT-4 memory.</p>
    </div>
    <div className="mt-8 space-y-2">
      <button
        onClick={() => {
          onTabChange?.('log');
          onScrollToComposer?.();
        }}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
          activeTab === 'log'
            ? 'border-primary bg-primary/10 text-white'
            : 'border-transparent text-white/70 hover:border-primary hover:bg-primary/10'
        }`}
      >
        <MessageSquareText className="h-4 w-4 text-primary" />
        Memory Log
      </button>
      <button
        onClick={() => onTabChange?.('timeline')}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
          activeTab === 'timeline'
            ? 'border-primary bg-primary/10 text-white'
            : 'border-transparent text-white/70 hover:border-primary hover:bg-primary/10'
        }`}
      >
        <CalendarDays className="h-4 w-4 text-primary" />
        Timeline
      </button>
      <button
        className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm text-white/70 transition hover:border-primary hover:bg-primary/10"
      >
        <BookMarked className="h-4 w-4 text-primary" />
        Chapters
      </button>
      <button
        onClick={() => {
          const chatPanel = document.querySelector('[data-chat-panel]');
          chatPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm text-white/70 transition hover:border-primary hover:bg-primary/10"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Ask Lore Keeper
      </button>
    </div>
    <div className="mt-auto">
      <Button className="w-full" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateChapter}>
        New Chapter
      </Button>
    </div>
  </aside>
);
