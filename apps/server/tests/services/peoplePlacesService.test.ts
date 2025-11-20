import { describe, it, expect, vi, beforeEach } from 'vitest';
import { peoplePlacesService } from '../../src/services/peoplePlacesService';
import { supabaseAdmin } from '../../src/services/supabaseClient';

// Mock dependencies
vi.mock('../../src/services/supabaseClient');
vi.mock('../../src/services/memoryService');
vi.mock('../../src/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('PeoplePlacesService', () => {
  let mockFrom: any;
  let mockSelect: any;
  let mockEq: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockLimit = vi.fn().mockResolvedValue({
      data: [],
      error: null
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    (supabaseAdmin.from as any) = mockFrom;
  });

  describe('listPeoplePlaces', () => {
    it('should return empty array when no entities exist', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });
      mockEq.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });

      const result = await peoplePlacesService.listPeoplePlaces('user-123');

      expect(result).toEqual([]);
      expect(mockFrom).toHaveBeenCalledWith('people_places');
    });

    it('should return entities with correct structure', async () => {
      const mockEntities = [
        {
          id: 'entity-1',
          user_id: 'user-123',
          name: 'John Doe',
          type: 'person',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockEntities,
        error: null
      });
      mockEq.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });

      const result = await peoplePlacesService.listPeoplePlaces('user-123');

      expect(result).toEqual(mockEntities);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('type');
    });

    it('should filter by type when provided', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });
      const mockFilter = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });
      mockEq.mockReturnValue({ eq: mockFilter });

      await peoplePlacesService.listPeoplePlaces('user-123', { type: 'person' });

      expect(mockEq).toHaveBeenCalledWith('type', 'person');
    });

    it('should handle database errors', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      mockEq.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });

      await expect(peoplePlacesService.listPeoplePlaces('user-123')).rejects.toThrow();
    });
  });

  describe('getEntity', () => {
    it('should return entity by id', async () => {
      const mockEntity = {
        id: 'entity-1',
        user_id: 'user-123',
        name: 'John Doe',
        type: 'person'
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockEntity,
        error: null
      });
      mockEq.mockReturnValue({ single: mockSingle });

      const result = await peoplePlacesService.getEntity('user-123', 'entity-1');

      expect(result).toEqual(mockEntity);
      expect(mockEq).toHaveBeenCalledWith('id', 'entity-1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return null when entity not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      mockEq.mockReturnValue({ single: mockSingle });

      const result = await peoplePlacesService.getEntity('user-123', 'non-existent');

      expect(result).toBeNull();
    });
  });
});

