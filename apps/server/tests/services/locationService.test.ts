import { describe, it, expect, vi, beforeEach } from 'vitest';
import { locationService } from '../../src/services/locationService';
import { supabaseAdmin } from '../../src/services/supabaseClient';
import type { MemoryEntry, LocationProfile } from '../../src/types';

// Mock dependencies
vi.mock('../../src/services/supabaseClient');
vi.mock('../../src/services/chapterService');
vi.mock('../../src/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('LocationService', () => {
  let mockFrom: any;
  let mockSelect: any;
  let mockEq: any;
  let mockOrder: any;
  let mockLimit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLimit = vi.fn().mockResolvedValue({
      data: [],
      error: null
    });
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    (supabaseAdmin.from as any) = mockFrom;
  });

  describe('listLocations', () => {
    it('should return empty array when no locations exist', async () => {
      mockLimit.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await locationService.listLocations('user-123');

      expect(result).toEqual([]);
      expect(mockFrom).toHaveBeenCalledWith('locations');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return locations with correct structure', async () => {
      const mockLocations: LocationProfile[] = [
        {
          id: 'loc-1',
          user_id: 'user-123',
          name: 'Test Location',
          slug: 'test-location',
          entry_count: 5,
          coordinates: { lat: 40.7128, lng: -74.0060 },
          sources: ['manual'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockLimit.mockResolvedValue({
        data: mockLocations,
        error: null
      });

      const result = await locationService.listLocations('user-123');

      expect(result).toEqual(mockLocations);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('slug');
    });

    it('should handle database errors', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST_ERROR' }
      });

      await expect(locationService.listLocations('user-123')).rejects.toThrow();
    });
  });

  describe('getLocationProfile', () => {
    it('should return location profile by id', async () => {
      const mockLocation: LocationProfile = {
        id: 'loc-1',
        user_id: 'user-123',
        name: 'Test Location',
        slug: 'test-location',
        entry_count: 5,
        coordinates: { lat: 40.7128, lng: -74.0060 },
        sources: ['manual'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockLocation,
        error: null
      });
      mockEq.mockReturnValue({ single: mockSingle });

      const result = await locationService.getLocationProfile('user-123', 'loc-1');

      expect(result).toEqual(mockLocation);
      expect(mockEq).toHaveBeenCalledWith('id', 'loc-1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return null when location not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      mockEq.mockReturnValue({ single: mockSingle });

      const result = await locationService.getLocationProfile('user-123', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('extractCoordinates', () => {
    it('should extract coordinates from metadata.gps', () => {
      const metadata = {
        gps: { lat: 40.7128, lng: -74.0060 }
      };

      // Access private method via any for testing
      const result = (locationService as any).extractCoordinates(metadata);

      expect(result).toEqual({ lat: 40.7128, lng: -74.0060 });
    });

    it('should extract coordinates from metadata.location', () => {
      const metadata = {
        location: { latitude: 40.7128, longitude: -74.0060 }
      };

      const result = (locationService as any).extractCoordinates(metadata);

      expect(result).toEqual({ lat: 40.7128, lng: -74.0060 });
    });

    it('should return null when no coordinates found', () => {
      const metadata = {};

      const result = (locationService as any).extractCoordinates(metadata);

      expect(result).toBeNull();
    });
  });

  describe('normalizeKey', () => {
    it('should normalize location names', () => {
      const result = (locationService as any).normalizeKey('  New York City  ');

      expect(result).toBe('new york city');
    });
  });

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      const result = (locationService as any).slugify('New York City!');

      expect(result).toBe('new-york-city');
    });

    it('should handle special characters', () => {
      const result = (locationService as any).slugify('São Paulo, Brazil');

      expect(result).toBe('s-o-paulo-brazil');
    });

    it('should limit slug length', () => {
      const longName = 'a'.repeat(100);
      const result = (locationService as any).slugify(longName);

      expect(result.length).toBeLessThanOrEqual(60);
    });
  });
});

