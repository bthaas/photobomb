import { BackgroundTask, TaskType, TaskPriority, TaskStatus, TaskResult } from '../../types/background';

export class TaskQueue {
  private tasks: Map<string, BackgroundTask> = new Map();
  private priorityQueues: Map<TaskPriority, BackgroundTask[]> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrentTasks: number = 2;
  private listeners: ((event: TaskQueueEvent) => void)[] = [];

  constructor(maxConcurrentTasks: number = 2) {
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.initializePriorityQueues();
  }

  private initializePriorityQueues(): void {
    Object.values(TaskPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.priorityQueues.set(priority, []);
      }
    });
  }

  public addTask(task: Omit<BackgroundTask, 'id' | 'createdAt' | 'status' | 'progress' | 'retryCount'>): string {
    const fullTask: BackgroundTask = {
      ...task,
      id: this.generateTaskId(),
      createdAt: new Date(),
      status: TaskStatus.PENDING,
      progress: 0,
      retryCount: 0,
      maxRetries: task.maxRetries || 3,
    };

    this.tasks.set(fullTask.id, fullTask);
    this.addToQueue(fullTask);
    
    this.notifyListeners({
      type: 'task_added',
      task: fullTask,
    });

    return fullTask.id;
  }

  public removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Remove from running tasks if it's running
    if (this.runningTasks.has(taskId)) {
      this.runningTasks.delete(taskId);
    }

    // Remove from priority queue
    const queue = this.priorityQueues.get(task.priority);
    if (queue) {
      const index = queue.findIndex(t => t.id === taskId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }

    // Remove from tasks map
    this.tasks.delete(taskId);

    this.notifyListeners({
      type: 'task_removed',
      task,
    });

    return true;
  }

  public getNextTask(): BackgroundTask | null {
    // Check if we've reached the concurrent task limit
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      return null;
    }

    // Get task from highest priority queue first
    const priorities = [TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.NORMAL, TaskPriority.LOW];
    
    for (const priority of priorities) {
      const queue = this.priorityQueues.get(priority);
      if (queue && queue.length > 0) {
        const task = queue.shift()!;
        this.runningTasks.add(task.id);
        task.status = TaskStatus.RUNNING;
        task.startedAt = new Date();
        
        this.notifyListeners({
          type: 'task_started',
          task,
        });

        return task;
      }
    }

    return null;
  }

  public completeTask(taskId: string, result: TaskResult): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.runningTasks.delete(taskId);
    task.completedAt = new Date();
    task.progress = 100;

    if (result.success) {
      task.status = TaskStatus.COMPLETED;
      this.notifyListeners({
        type: 'task_completed',
        task,
        result,
      });
    } else {
      task.error = result.error;
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = TaskStatus.PENDING;
        task.startedAt = undefined;
        task.progress = 0;
        this.addToQueue(task);
        
        this.notifyListeners({
          type: 'task_retrying',
          task,
          result,
        });
      } else {
        task.status = TaskStatus.FAILED;
        this.notifyListeners({
          type: 'task_failed',
          task,
          result,
        });
      }
    }
  }

  public updateTaskProgress(taskId: string, progress: number, stage?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.progress = Math.max(0, Math.min(100, progress));
    
    this.notifyListeners({
      type: 'task_progress',
      task,
      progress,
      stage,
    });
  }

  public pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== TaskStatus.RUNNING) {
      return false;
    }

    task.status = TaskStatus.PAUSED;
    this.runningTasks.delete(taskId);
    
    this.notifyListeners({
      type: 'task_paused',
      task,
    });

    return true;
  }

  public resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== TaskStatus.PAUSED) {
      return false;
    }

    task.status = TaskStatus.PENDING;
    this.addToQueue(task);
    
    this.notifyListeners({
      type: 'task_resumed',
      task,
    });

    return true;
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === TaskStatus.RUNNING) {
      this.runningTasks.delete(taskId);
    }

    task.status = TaskStatus.CANCELLED;
    
    this.notifyListeners({
      type: 'task_cancelled',
      task,
    });

    return true;
  }

  public getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  public getTasksByStatus(status: TaskStatus): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  public getTasksByType(type: TaskType): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(task => task.type === type);
  }

  public getQueueLength(): number {
    return Array.from(this.priorityQueues.values()).reduce((total, queue) => total + queue.length, 0);
  }

  public getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  public setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = Math.max(1, max);
  }

  public clear(): void {
    this.tasks.clear();
    this.runningTasks.clear();
    this.priorityQueues.forEach(queue => queue.length = 0);
    
    this.notifyListeners({
      type: 'queue_cleared',
    });
  }

  public addListener(callback: (event: TaskQueueEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private addToQueue(task: BackgroundTask): void {
    const queue = this.priorityQueues.get(task.priority);
    if (queue) {
      // Insert task in the correct position based on creation time (FIFO within priority)
      queue.push(task);
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyListeners(event: TaskQueueEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error in task queue listener:', error);
      }
    });
  }
}

export interface TaskQueueEvent {
  type: 'task_added' | 'task_removed' | 'task_started' | 'task_completed' | 'task_failed' | 
        'task_retrying' | 'task_progress' | 'task_paused' | 'task_resumed' | 'task_cancelled' | 'queue_cleared';
  task?: BackgroundTask;
  result?: TaskResult;
  progress?: number;
  stage?: string;
}