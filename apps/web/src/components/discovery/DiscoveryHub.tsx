import { useState } from 'react';
import { Compass, Brain, Users, BookOpen, Network, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { IdentityPulsePanel } from '../identity/IdentityPulsePanel';
import { CharacterBook } from '../characters/CharacterBook';
import { SagaScreen } from '../saga/SagaScreen';
import { MemoryFabricPanel } from '../fabric/MemoryFabricPanel';
import { InsightsPanel } from '../InsightsPanel';
import { AutopilotPanel } from '../AutopilotPanel';
import { fetchJson } from '../../lib/api';

type PanelKey = 'identity' | 'characters' | 'saga' | 'fabric' | 'insights' | 'autopilot';

const panelConfig: Record<PanelKey, { label: string; icon: typeof Compass; description: string }> = {
  identity: {
    label: 'Identity Pulse',
    icon: Brain,
    description: 'Your persona signature and emotional trajectory'
  },
  characters: {
    label: 'Characters',
    icon: Users,
    description: 'Relationship graphs and closeness trends'
  },
  saga: {
    label: 'Saga',
    icon: BookOpen,
    description: 'Narrative arcs and story structure'
  },
  fabric: {
    label: 'Memory Fabric',
    icon: Network,
    description: 'Connections between memories'
  },
  insights: {
    label: 'Insights',
    icon: Sparkles,
    description: 'Patterns, correlations, and predictions'
  },
  autopilot: {
    label: 'Autopilot',
    icon: Zap,
    description: 'AI life guidance and recommendations'
  }
};

export const DiscoveryHub = () => {
  const [panelsOpen, setPanelsOpen] = useState<Record<PanelKey, boolean>>({
    identity: false,
    characters: false,
    saga: false,
    fabric: false,
    insights: false,
    autopilot: false
  });
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const togglePanel = (panel: PanelKey) => {
    setPanelsOpen((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const result = await fetchJson<{ insights?: any }>('/api/insights/recent');
      setInsights(result.insights || result);
    } catch (error) {
      console.error('Failed to load insights:', error);
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  };

  const hasOpenPanels = Object.values(panelsOpen).some(Boolean);

  return (
    <div className="space-y-6" role="main" aria-label="Discovery Hub">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 border-purple-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Compass className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Discovery Hub</CardTitle>
                <CardDescription className="text-white/70">
                  Explore insights, patterns, and connections in your journal
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Panel Toggles */}
      <Card className="bg-black/40 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg text-white">Analytical Panels</CardTitle>
          <CardDescription className="text-white/60">
            Toggle panels to explore different aspects of your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.keys(panelConfig) as PanelKey[]).map((key) => {
              const config = panelConfig[key];
              const Icon = config.icon;
              const isOpen = panelsOpen[key];
              
              return (
                <button
                  key={key}
                  onClick={() => togglePanel(key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    isOpen
                      ? 'border-primary bg-primary/10 text-white shadow-lg shadow-primary/20'
                      : 'border-border/60 bg-black/20 text-white/70 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isOpen ? 'text-primary' : 'text-white/50'}`} />
                  <div className="text-center">
                    <div className={`text-sm font-medium ${isOpen ? 'text-white' : 'text-white/70'}`}>
                      {config.label}
                    </div>
                    <div className="text-xs text-white/50 mt-1">{config.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Open Panels */}
      {hasOpenPanels && (
        <div className="space-y-6">
          {panelsOpen.identity && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <IdentityPulsePanel />
            </div>
          )}
          
          {panelsOpen.characters && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CharacterBook />
            </div>
          )}
          
          {panelsOpen.saga && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <SagaScreen />
            </div>
          )}
          
          {panelsOpen.fabric && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <MemoryFabricPanel />
            </div>
          )}
          
          {panelsOpen.insights && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <InsightsPanel
                insights={insights}
                loading={insightsLoading}
                onRefresh={loadInsights}
              />
            </div>
          )}
          
          {panelsOpen.autopilot && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <AutopilotPanel />
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasOpenPanels && (
        <Card className="bg-black/20 border-border/40">
          <CardContent className="p-12 text-center">
            <Compass className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white/60 mb-2">No Panels Open</h3>
            <p className="text-sm text-white/40">
              Select a panel above to start exploring your data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

