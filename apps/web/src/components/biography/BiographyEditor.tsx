import { useState, useRef, useEffect } from 'react';
import { BookOpen, Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { fetchJson } from '../../lib/api';
import { useChatStream } from '../../hooks/useChatStream';
import { MarkdownRenderer } from '../chat/MarkdownRenderer';
import { useLoreKeeper } from '../../hooks/useLoreKeeper';

type BiographyMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type BiographySection = {
  id: string;
  title: string;
  content: string;
  order: number;
  period?: { from: string; to: string };
  lastUpdated?: string;
};

export const BiographyEditor = () => {
  const [messages, setMessages] = useState<BiographyMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<BiographySection[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { streamChat, isStreaming, cancel } = useChatStream();
  const { refreshEntries, refreshTimeline, refreshChapters } = useLoreKeeper();

  useEffect(() => {
    loadBiography();
    // Start with a welcome message
    const welcomeMessage: BiographyMessage = {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm here to help you write your biography. You can ask me to:\n\n- Create new sections about your life\n- Edit existing sections\n- Add details to specific periods\n- Organize your biography\n- Generate content from your journal entries\n\nWhat would you like to work on?",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessageId]);

  const loadBiography = async () => {
    try {
      const data = await fetchJson<{ sections: BiographySection[] }>('/api/biography/sections');
      setSections(data.sections || []);
    } catch (error) {
      console.error('Failed to load biography:', error);
      // If endpoint doesn't exist yet, start with empty sections
      setSections([]);
      // Show a helpful message in the chat
      if (messages.length === 1) {
        const errorMessage: BiographyMessage = {
          id: 'load-error',
          role: 'assistant',
          content: "I'm ready to help you write your biography! The sections list will appear here once we start creating content.\n\nYou can ask me to:\n- Create a new section about a specific period of your life\n- Write about a particular topic or theme\n- Organize your biography into chapters\n- Edit or expand existing sections\n\nWhat would you like to start with?",
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading || isStreaming) return;

    const userMessage: BiographyMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Create streaming message
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: BiographyMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessageId(assistantMessageId);

      // Build conversation history
      const conversationHistory = [...messages, userMessage]
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      let accumulatedContent = '';

      // Stream the response
      await streamChat(
        textToSend,
        conversationHistory.slice(0, -1), // Exclude current message
        (chunk: string) => {
          accumulatedContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        },
        () => {}, // metadata callback
        async () => {
          // Complete callback
          setStreamingMessageId(null);
          
          // Check if the response includes section updates
          try {
            const response = await fetchJson<{
              sections?: BiographySection[];
              sectionId?: string;
              action?: 'created' | 'updated' | 'deleted';
            }>('/api/biography/chat', {
              method: 'POST',
              body: JSON.stringify({
                message: textToSend,
                conversationHistory: conversationHistory.slice(0, -1)
              })
            });

            if (response.sections) {
              setSections(response.sections);
            }
          } catch (error) {
            console.error('Failed to process biography update:', error);
          }
        },
        (error: string) => {
          setStreamingMessageId(null);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: `Error: ${error}` }
                : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: BiographyMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/50 p-4 bg-black/40">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold text-white">My Biography</h1>
            <p className="text-sm text-white/60">Chat with AI to write and edit your biography</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col border-r border-border/50">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <Card
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-black/40 border-border/50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="prose prose-invert max-w-none">
                      <MarkdownRenderer content={message.content || '...'} />
                    </div>
                    {message.id === streamingMessageId && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Writing...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-4 bg-black/40">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to create a section, edit content, or organize your biography..."
                className="flex-1 bg-black/60 border-border/50 text-white resize-none"
                rows={3}
                disabled={loading || isStreaming}
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading || isStreaming}
                className="self-end"
              >
                {loading || isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-white/40 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Biography Preview */}
        <div className="w-96 overflow-y-auto bg-black/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Biography Sections
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={loadBiography}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-white/20" />
              <p className="text-sm">No sections yet</p>
              <p className="text-xs text-white/40 mt-2">
                Start chatting to create your biography sections
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <Card key={section.id} className="bg-black/40 border-border/50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white mb-2">{section.title}</h3>
                      {section.period && (
                        <p className="text-xs text-white/50 mb-2">
                          {new Date(section.period.from).toLocaleDateString()} -{' '}
                          {new Date(section.period.to).toLocaleDateString()}
                        </p>
                      )}
                      <div className="prose prose-invert prose-sm max-w-none">
                        <MarkdownRenderer
                          content={
                            section.content || '*No content yet. Ask me to write this section.*'
                          }
                        />
                      </div>
                      {section.lastUpdated && (
                        <p className="text-xs text-white/40 mt-2">
                          Updated: {new Date(section.lastUpdated).toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

