import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskEngineService } from '../../src/services/taskEngineService';
import { supabaseAdmin } from '../../src/services/supabaseClient';
import type { TaskRecord, TaskStatus, TaskCategory } from '../../src/types';

// Mock dependencies
vi.mock('../../src/services/supabaseClient');
vi.mock('../../src/services/taskTimelineService');
vi.mock('../../src/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('TaskEngineService', () => {
  let mockFrom: any;
  let mockSelect: any;
  let mockEq: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockDelete: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockLimit = vi.fn().mockResolvedValue({
      data: [],
      error: null
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq, select: mockSelect });
    mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    });
    
    (supabaseAdmin.from as any) = mockFrom;
  });

  describe('listTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });
      mockEq.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });

      const result = await taskEngineService.listTasks('user-123');

      expect(result).toEqual([]);
      expect(mockFrom).toHaveBeenCalledWith('tasks');
    });

    it('should filter by status when provided', async () => {
      const mockTasks: TaskRecord[] = [
        {
          id: 'task-1',
          user_id: 'user-123',
          title: 'Test Task',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z'
        } as TaskRecord
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockTasks,
        error: null
      });
      mockEq.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });

      const result = await taskEngineService.listTasks('user-123', { status: 'pending' });

      expect(result).toEqual(mockTasks);
      expect(mockEq).toHaveBeenCalledWith('status', 'pending');
    });

    it('should handle database errors', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      mockEq.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: mockLimit }) });

      await expect(taskEngineService.listTasks('user-123')).rejects.toThrow();
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        category: 'work' as TaskCategory,
        status: 'pending' as TaskStatus
      };

      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'task-1', ...newTask }],
        error: null
      });
      mockInsert.mockReturnValue({ select: mockSelect });

      const result = await taskEngineService.createTask('user-123', newTask);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('New Task');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidTask = {
        title: '', // Invalid: empty title
        status: 'pending' as TaskStatus
      };

      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Validation error', code: '23514' }
      });
      mockInsert.mockReturnValue({ select: mockSelect });

      await expect(taskEngineService.createTask('user-123', invalidTask as any)).rejects.toThrow();
    });
  });

  describe('updateTask', () => {
    it('should update task status', async () => {
      const updatedTask = {
        status: 'completed' as TaskStatus
      };

      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'task-1', ...updatedTask }],
        error: null
      });
      mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });

      const result = await taskEngineService.updateTask('user-123', 'task-1', updatedTask);

      expect(result.status).toBe('completed');
      expect(mockEq).toHaveBeenCalledWith('id', 'task-1');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return null when task not found', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });

      const result = await taskEngineService.updateTask('user-123', 'non-existent', { status: 'completed' });

      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      await taskEngineService.deleteTask('user-123', 'task-1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Deletion failed' }
          })
        })
      });

      await expect(taskEngineService.deleteTask('user-123', 'task-1')).rejects.toThrow();
    });
  });

  describe('extractTasksFromChat', () => {
    it('should extract tasks from chat message', async () => {
      const message = 'I need to finish the project by Friday';
      
      // Mock the extraction logic
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });
      mockInsert.mockReturnValue({ select: mockSelect });

      const result = await taskEngineService.extractTasksFromChat('user-123', message);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('commands');
      expect(Array.isArray(result.created)).toBe(true);
    });

    it('should handle empty messages', async () => {
      const result = await taskEngineService.extractTasksFromChat('user-123', '');

      expect(result.created).toEqual([]);
      expect(result.commands).toEqual([]);
    });
  });
});

