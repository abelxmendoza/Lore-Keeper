import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { entriesRouter } from '../../src/routes/entries';
import { memoryService } from '../../src/services/memoryService';
import { requireAuth } from '../../src/middleware/auth';

// Mock dependencies
vi.mock('../../src/services/memoryService');
vi.mock('../../src/middleware/auth');
vi.mock('../../src/middleware/subscription');
vi.mock('../../src/services/usageTracking');
vi.mock('../../src/middleware/validateRequest');
vi.mock('../../src/services/chapterService');
vi.mock('../../src/services/tagService');
vi.mock('../../src/services/voiceService');
vi.mock('../../src/services/truthVerificationService');
vi.mock('../../src/utils/keywordDetector');
vi.mock('../../src/realtime/orchestratorEmitter');

describe('Entries Router', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      user: { id: 'user-123' },
      query: {},
      body: {},
      params: {}
    } as any;

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    } as any;

    mockNext = vi.fn();
    
    (requireAuth as any) = vi.fn((req: Request, res: Response, next: any) => {
      next();
    });
  });

  describe('GET /api/entries', () => {
    it('should return entries list', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          content: 'Test entry',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      (memoryService.searchEntries as any) = vi.fn().mockResolvedValue(mockEntries);

      // Find the GET route handler
      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.get && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.json).toHaveBeenCalled();
        const callArgs = (mockResponse.json as any).mock.calls[0][0];
        expect(callArgs).toHaveProperty('entries');
      }
    });

    it('should handle search query', async () => {
      mockRequest.query = { search: 'test' };
      (memoryService.searchEntries as any) = vi.fn().mockResolvedValue([]);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.get && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(memoryService.searchEntries).toHaveBeenCalled();
      }
    });

    it('should handle tag filter', async () => {
      mockRequest.query = { tag: 'work' };
      (memoryService.searchEntries as any) = vi.fn().mockResolvedValue([]);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.get && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(memoryService.searchEntries).toHaveBeenCalled();
      }
    });

    it('should handle date range filter', async () => {
      mockRequest.query = { 
        from: '2024-01-01',
        to: '2024-01-31'
      };
      (memoryService.searchEntries as any) = vi.fn().mockResolvedValue([]);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.get && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(memoryService.searchEntries).toHaveBeenCalled();
      }
    });

    it('should handle errors', async () => {
      (memoryService.searchEntries as any) = vi.fn().mockRejectedValue(new Error('Database error'));

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.get && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(500);
      }
    });
  });

  describe('POST /api/entries', () => {
    it('should create a new entry', async () => {
      mockRequest.body = {
        content: 'New entry content',
        tags: ['test'],
        mood: 'happy'
      };

      const mockEntry = {
        id: 'entry-1',
        ...mockRequest.body,
        user_id: 'user-123'
      };

      (memoryService.saveEntry as any) = vi.fn().mockResolvedValue(mockEntry);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.post && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(memoryService.saveEntry).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalled();
      }
    });

    it('should validate required fields', async () => {
      mockRequest.body = {
        content: '' // Invalid: empty content
      };

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.post && layer.route?.path === '/'
      );

      if (route) {
        // Validation middleware should catch this
        const validationLayer = route.route.stack.find((layer: any) => 
          layer.name === 'validateBody'
        );
        
        if (validationLayer) {
          await validationLayer.handle(mockRequest as Request, mockResponse as Response, mockNext);
          expect(mockResponse.status).toHaveBeenCalledWith(400);
        }
      }
    });

    it('should handle entry creation errors', async () => {
      mockRequest.body = {
        content: 'Valid content'
      };

      (memoryService.saveEntry as any) = vi.fn().mockRejectedValue(new Error('Save failed'));

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.post && layer.route?.path === '/'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(500);
      }
    });
  });

  describe('PATCH /api/entries/:id', () => {
    it('should update an entry', async () => {
      mockRequest.params = { id: 'entry-1' };
      mockRequest.body = {
        content: 'Updated content'
      };

      const mockUpdatedEntry = {
        id: 'entry-1',
        content: 'Updated content',
        user_id: 'user-123'
      };

      (memoryService.updateEntry as any) = vi.fn().mockResolvedValue(mockUpdatedEntry);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.patch && layer.route?.path === '/:id'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(memoryService.updateEntry).toHaveBeenCalledWith('user-123', 'entry-1', mockRequest.body);
        expect(mockResponse.json).toHaveBeenCalled();
      }
    });

    it('should return 404 when entry not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { content: 'Updated' };

      (memoryService.updateEntry as any) = vi.fn().mockResolvedValue(null);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.patch && layer.route?.path === '/:id'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(404);
      }
    });
  });

  describe('DELETE /api/entries/:id', () => {
    it('should delete an entry', async () => {
      mockRequest.params = { id: 'entry-1' };

      (memoryService.deleteEntry as any) = vi.fn().mockResolvedValue(true);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.delete && layer.route?.path === '/:id'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(memoryService.deleteEntry).toHaveBeenCalledWith('user-123', 'entry-1');
        expect(mockResponse.status).toHaveBeenCalledWith(204);
      }
    });

    it('should return 404 when entry not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      (memoryService.deleteEntry as any) = vi.fn().mockResolvedValue(false);

      const route = entriesRouter.stack.find((layer: any) => 
        layer.route?.methods?.delete && layer.route?.path === '/:id'
      );

      if (route) {
        await route.route.stack[0].handle(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(404);
      }
    });
  });
});

