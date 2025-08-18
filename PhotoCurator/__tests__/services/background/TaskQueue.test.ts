import { TaskQueue } from '../../../src/services/background/TaskQueue';
import { TaskType, TaskPriority, TaskStatus } from '../../../src/types/background';

describe('TaskQueue', () => {
  let taskQueue: TaskQueue;

  beforeEach(() => {
    taskQueue = new TaskQueue(2);
  });

  describe('task management', () => {
    it('should add task and return task ID', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_/);
    });

    it('should retrieve task by ID', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const task = taskQueue.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.status).toBe(TaskStatus.PENDING);
    });

    it('should remove task successfully', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const removed = taskQueue.removeTask(taskId);
      expect(removed).toBe(true);
      expect(taskQueue.getTask(taskId)).toBeUndefined();
    });

    it('should return false when removing non-existent task', () => {
      const removed = taskQueue.removeTask('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('priority queue', () => {
    it('should return highest priority task first', () => {
      const lowPriorityId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.LOW,
        data: { photos: [] },
        maxRetries: 3,
      });

      const highPriorityId = taskQueue.addTask({
        type: TaskType.FACE_DETECTION,
        priority: TaskPriority.HIGH,
        data: { photos: [] },
        maxRetries: 3,
      });

      const nextTask = taskQueue.getNextTask();
      expect(nextTask?.id).toBe(highPriorityId);
      expect(nextTask?.status).toBe(TaskStatus.RUNNING);
    });

    it('should respect concurrent task limit', () => {
      // Add 3 tasks but limit is 2
      const task1Id = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const task2Id = taskQueue.addTask({
        type: TaskType.FACE_DETECTION,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const task3Id = taskQueue.addTask({
        type: TaskType.CLUSTERING,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      // Should get first two tasks
      const firstTask = taskQueue.getNextTask();
      const secondTask = taskQueue.getNextTask();
      const thirdTask = taskQueue.getNextTask();

      expect(firstTask).toBeDefined();
      expect(secondTask).toBeDefined();
      expect(thirdTask).toBeNull(); // Should be null due to concurrent limit
    });

    it('should return null when no tasks available', () => {
      const nextTask = taskQueue.getNextTask();
      expect(nextTask).toBeNull();
    });
  });

  describe('task completion', () => {
    it('should complete task successfully', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const task = taskQueue.getNextTask();
      expect(task?.id).toBe(taskId);

      taskQueue.completeTask(taskId, {
        success: true,
        data: { results: [] },
        processingTime: 1000,
        resourcesUsed: { memory: 100, cpu: 50, battery: 10 },
      });

      const completedTask = taskQueue.getTask(taskId);
      expect(completedTask?.status).toBe(TaskStatus.COMPLETED);
      expect(completedTask?.progress).toBe(100);
      expect(completedTask?.completedAt).toBeDefined();
    });

    it('should retry failed task within retry limit', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 2,
      });

      const task = taskQueue.getNextTask();
      expect(task?.id).toBe(taskId);

      // Fail the task
      taskQueue.completeTask(taskId, {
        success: false,
        error: 'Test error',
        processingTime: 500,
        resourcesUsed: { memory: 50, cpu: 25, battery: 5 },
      });

      const retriedTask = taskQueue.getTask(taskId);
      expect(retriedTask?.status).toBe(TaskStatus.PENDING);
      expect(retriedTask?.retryCount).toBe(1);
      expect(retriedTask?.error).toBe('Test error');
    });

    it('should mark task as failed after exceeding retry limit', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 1,
      });

      // Get and fail task twice
      let task = taskQueue.getNextTask();
      taskQueue.completeTask(taskId, {
        success: false,
        error: 'First failure',
        processingTime: 500,
        resourcesUsed: { memory: 50, cpu: 25, battery: 5 },
      });

      task = taskQueue.getNextTask();
      taskQueue.completeTask(taskId, {
        success: false,
        error: 'Second failure',
        processingTime: 500,
        resourcesUsed: { memory: 50, cpu: 25, battery: 5 },
      });

      const failedTask = taskQueue.getTask(taskId);
      expect(failedTask?.status).toBe(TaskStatus.FAILED);
      expect(failedTask?.retryCount).toBe(1);
    });
  });

  describe('task control', () => {
    it('should pause running task', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.getNextTask(); // Start the task
      const paused = taskQueue.pauseTask(taskId);

      expect(paused).toBe(true);
      expect(taskQueue.getTask(taskId)?.status).toBe(TaskStatus.PAUSED);
      expect(taskQueue.getRunningTaskCount()).toBe(0);
    });

    it('should resume paused task', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.getNextTask(); // Start the task
      taskQueue.pauseTask(taskId);
      const resumed = taskQueue.resumeTask(taskId);

      expect(resumed).toBe(true);
      expect(taskQueue.getTask(taskId)?.status).toBe(TaskStatus.PENDING);
    });

    it('should cancel task', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const cancelled = taskQueue.cancelTask(taskId);

      expect(cancelled).toBe(true);
      expect(taskQueue.getTask(taskId)?.status).toBe(TaskStatus.CANCELLED);
    });

    it('should update task progress', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.updateTaskProgress(taskId, 50, 'Processing...');

      const task = taskQueue.getTask(taskId);
      expect(task?.progress).toBe(50);
    });

    it('should clamp progress values', () => {
      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.updateTaskProgress(taskId, 150); // Over 100
      expect(taskQueue.getTask(taskId)?.progress).toBe(100);

      taskQueue.updateTaskProgress(taskId, -10); // Under 0
      expect(taskQueue.getTask(taskId)?.progress).toBe(0);
    });
  });

  describe('queue statistics', () => {
    it('should return correct queue length', () => {
      expect(taskQueue.getQueueLength()).toBe(0);

      taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      expect(taskQueue.getQueueLength()).toBe(1);
    });

    it('should return correct running task count', () => {
      expect(taskQueue.getRunningTaskCount()).toBe(0);

      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.getNextTask();
      expect(taskQueue.getRunningTaskCount()).toBe(1);
    });

    it('should filter tasks by status', () => {
      const taskId1 = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const taskId2 = taskQueue.addTask({
        type: TaskType.FACE_DETECTION,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.getNextTask(); // Start first task

      const pendingTasks = taskQueue.getTasksByStatus(TaskStatus.PENDING);
      const runningTasks = taskQueue.getTasksByStatus(TaskStatus.RUNNING);

      expect(pendingTasks).toHaveLength(1);
      expect(runningTasks).toHaveLength(1);
      expect(pendingTasks[0].id).toBe(taskId2);
      expect(runningTasks[0].id).toBe(taskId1);
    });

    it('should filter tasks by type', () => {
      taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.addTask({
        type: TaskType.FACE_DETECTION,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const analysisTasks = taskQueue.getTasksByType(TaskType.PHOTO_ANALYSIS);
      const faceDetectionTasks = taskQueue.getTasksByType(TaskType.FACE_DETECTION);

      expect(analysisTasks).toHaveLength(1);
      expect(faceDetectionTasks).toHaveLength(1);
    });
  });

  describe('configuration', () => {
    it('should update max concurrent tasks', () => {
      taskQueue.setMaxConcurrentTasks(4);

      // Add 5 tasks
      for (let i = 0; i < 5; i++) {
        taskQueue.addTask({
          type: TaskType.PHOTO_ANALYSIS,
          priority: TaskPriority.NORMAL,
          data: { photos: [] },
          maxRetries: 3,
        });
      }

      // Should be able to get 4 tasks now
      let runningCount = 0;
      while (taskQueue.getNextTask()) {
        runningCount++;
      }

      expect(runningCount).toBe(4);
    });

    it('should enforce minimum concurrent tasks', () => {
      taskQueue.setMaxConcurrentTasks(0);

      taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      const task = taskQueue.getNextTask();
      expect(task).toBeDefined(); // Should still get 1 task (minimum)
    });
  });

  describe('event listeners', () => {
    it('should notify listeners of task events', () => {
      const listener = jest.fn();
      taskQueue.addListener(listener);

      const taskId = taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      expect(listener).toHaveBeenCalledWith({
        type: 'task_added',
        task: expect.objectContaining({ id: taskId }),
      });
    });

    it('should remove listeners correctly', () => {
      const listener = jest.fn();
      const removeListener = taskQueue.addListener(listener);

      taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      expect(listener).toHaveBeenCalledTimes(1);

      removeListener();
      listener.mockClear();

      taskQueue.addTask({
        type: TaskType.FACE_DETECTION,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clear queue', () => {
    it('should clear all tasks and notify listeners', () => {
      const listener = jest.fn();
      taskQueue.addListener(listener);

      taskQueue.addTask({
        type: TaskType.PHOTO_ANALYSIS,
        priority: TaskPriority.NORMAL,
        data: { photos: [] },
        maxRetries: 3,
      });

      taskQueue.clear();

      expect(taskQueue.getAllTasks()).toHaveLength(0);
      expect(taskQueue.getQueueLength()).toBe(0);
      expect(listener).toHaveBeenCalledWith({ type: 'queue_cleared' });
    });
  });
});