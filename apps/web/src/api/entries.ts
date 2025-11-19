import { fetchJson } from '../lib/api';
import { supabase } from '../lib/supabase';

export type Entry = {
  id: string;
  content: string;
  date: string;
  tags?: string[];
  chapterId?: string;
  mood?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type VoiceMemoResponse = {
  entry: Entry;
  transcript: string;
  formatted: {
    content: string;
    summary?: string;
    tags?: string[];
    mood?: string;
  };
};

/**
 * Upload a voice memo file for transcription and entry creation
 */
export const uploadVoiceMemo = async (file: File): Promise<VoiceMemoResponse> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const formData = new FormData();
  formData.append('audio', file);
  
  const response = await fetch(`${apiBaseUrl}/api/entries/voice`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to upload voice memo');
  }
  
  return response.json();
};

/**
 * Get tag suggestions for entry content
 */
export const suggestTags = async (content: string): Promise<string[]> => {
  const response = await fetchJson<{ tags: string[] }>('/api/entries/suggest-tags', {
    method: 'POST',
    body: JSON.stringify({ content })
  });
  return response.tags;
};

