import { EventEmitter } from 'events';

export interface Progress {
  taskName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  percentage: number;
  stages: StageProgress[];
  currentStage?: string;
  eta?: number;
  error?: Error;
}

export interface StageProgress {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  details?: string;
}

export class ProgressTracker extends EventEmitter {
  private progress: Progress;

  start(config: { taskName: string; stages: string[] }): void {
    this.progress = {
      taskName: config.taskName,
      status: 'running',
      percentage: 0,
      stages: config.stages.map((name) => ({
        name,
        status: 'pending',
        progress: 0,
      })),
    };
    this.emit('update', this.progress);
  }

  updateStage(stageName: string, update: Partial<StageProgress>): void {
    const stage = this.progress.stages.find((s) => s.name === stageName);
    if (stage) {
      Object.assign(stage, update);
      this.calculateOverallProgress();
      this.emit('update', this.progress);
    }
  }

  finish(): void {
    this.progress.status = 'completed';
    this.progress.percentage = 100;
    this.emit('update', this.progress);
  }

  fail(error: Error): void {
    this.progress.status = 'error';
    this.progress.error = error;
    this.emit('update', this.progress);
  }

  getProgress(): Progress {
    return { ...this.progress };
  }

  private calculateOverallProgress(): void {
    const totalStages = this.progress.stages.length;
    const completedStages = this.progress.stages.filter((s) => s.status === 'completed').length;
    const runningStage = this.progress.stages.find((s) => s.status === 'running');
    
    if (runningStage) {
      this.progress.percentage = ((completedStages + runningStage.progress / 100) / totalStages) * 100;
    } else {
      this.progress.percentage = (completedStages / totalStages) * 100;
    }
  }
}
