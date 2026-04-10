import { EventEmitter } from 'events';
import { TerminalOutputManager } from './TerminalOutputManager';

export interface Progress {
  taskName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  percentage: number;
  stages: StageProgress[];
  currentStage?: string;
  eta?: number;
  error?: Error;
  [key: string]: any;
}

export interface StageProgress {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  details?: string;
  [key: string]: any;
}

export class ProgressTracker extends EventEmitter {
  private progress!: Progress;
  private terminal: TerminalOutputManager;
  private streaming: boolean;

  constructor(options?: { streaming?: boolean }) {
    super();
    this.terminal = new TerminalOutputManager(options?.streaming ?? false);
    this.streaming = options?.streaming ?? false;
  }

  start(config: { taskName: string; stages: string[]; totalTasks?: number }): void {
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

    if (this.streaming) {
      this.renderStreaming();
    }
    
    this.emit('update', this.progress);
  }

  updateStage(stageName: string, update: Partial<StageProgress>): void {
    const stage = this.progress.stages.find((s) => s.name === stageName);
    if (stage) {
      Object.assign(stage, update);
      this.calculateOverallProgress();
      
      if (this.streaming) {
        this.renderStreaming();
      }
      
      this.emit('update', this.progress);
    }
  }

  finish(): void {
    this.progress.status = 'completed';
    this.progress.percentage = 100;
    
    for (const stage of this.progress.stages) {
      stage.status = 'completed';
      stage.progress = 100;
    }
    
    if (this.streaming) {
      this.terminal.writeLine('');
      this.terminal.writeLine(`✓ ${this.progress.taskName} completed`, { color: 'green', bold: true });
    }
    
    this.emit('update', this.progress);
  }

  fail(error: Error): void {
    this.progress.status = 'error';
    this.progress.error = error;
    
    if (this.streaming) {
      this.terminal.writeLine('');
      this.terminal.writeLine(`✗ ${this.progress.taskName} failed: ${error.message}`, { color: 'red', bold: true });
    }
    
    this.emit('update', this.progress);
  }

  getProgress(): Progress {
    return { ...this.progress };
  }

  enableStreaming(): void {
    this.streaming = true;
    this.terminal.enable();
  }

  disableStreaming(): void {
    this.streaming = false;
    this.terminal.disable();
  }

  private renderStreaming(): void {
    const lines: string[] = [];
    
    lines.push(`\x1b[2K\r🔍 ${this.progress.taskName}`);
    
    const statusIcon = (status: string) => {
      switch (status) {
        case 'completed': return '✓';
        case 'running': return '→';
        case 'error': return '✗';
        default: return '○';
      }
    };
    
    const statusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'green';
        case 'running': return 'cyan';
        case 'error': return 'red';
        default: return 'gray';
      }
    };
    
    for (const stage of this.progress.stages) {
      const icon = statusIcon(stage.status);
      const color = statusColor(stage.status);
      const details = stage.details ? ` (${stage.details})` : '';
      lines.push(`   ${icon} ${stage.name}: ${stage.progress}%${details}`);
    }
    
    const overallLine = `   Overall: ${this.progress.percentage.toFixed(1)}%`;
    
    this.terminal.write('\x1b[2K\r');
    this.terminal.write(lines.join('\n') + '\n');
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
