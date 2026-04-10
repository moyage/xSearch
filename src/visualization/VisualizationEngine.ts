export interface ChartData {
  labels?: string[];
  datasets?: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }>;
}

export interface VisualizationResult {
  type: string;
  template: string;
  data: any;
  rendered?: string;
}

export class VisualizationEngine {
  private templates: Map<string, (data: any) => string>;

  constructor() {
    this.templates = new Map();
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    this.templates.set('default', this.renderDefaultTemplate.bind(this));
    this.templates.set('minimal', this.renderMinimalTemplate.bind(this));
    this.templates.set('detailed', this.renderDetailedTemplate.bind(this));
  }

  async render(result: any, format: string): Promise<VisualizationResult> {
    switch (format) {
      case 'table':
        return this.renderTable(result);
      case 'chart':
        return this.renderChart(result);
      case 'infographic':
        return this.renderInfographic(result);
      default:
        return this.renderText(result);
    }
  }

  private renderTable(result: any): VisualizationResult {
    const data = result.sources || result.data || [];
    
    if (!Array.isArray(data) || data.length === 0) {
      return {
        type: 'table',
        template: 'empty',
        data: { message: 'No data to display' },
        rendered: '┌─────────────────────────┐\n│ No data to display       │\n└─────────────────────────┘',
      };
    }

    const headers = Object.keys(data[0] || {});
    const colWidths = headers.map(h => Math.max(h.length, 20));
    
    const lines: string[] = [];
    
    lines.push('┌' + colWidths.map(w => '─'.repeat(w)).join('─┬─') + '─┐');
    lines.push('│' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ') + ' │');
    lines.push('├' + colWidths.map(w => '─'.repeat(w)).join('─┼─') + '─┤');
    
    for (const row of data.slice(0, 10)) {
      const values = headers.map((h, i) => {
        const val = String(row[h] || '').substring(0, colWidths[i]);
        return val.padEnd(colWidths[i]);
      });
      lines.push('│' + values.join(' │ ') + ' │');
    }
    
    if (data.length > 10) {
      lines.push('└' + colWidths.map(w => '─'.repeat(w)).join('─┴─') + '─┘');
      lines.push(`... and ${data.length - 10} more rows`);
    } else {
      lines.push('└' + colWidths.map(w => '─'.repeat(w)).join('─┴─') + '─┘');
    }

    return {
      type: 'table',
      template: 'default',
      data: { headers, rows: data },
      rendered: lines.join('\n'),
    };
  }

  private renderChart(result: any): VisualizationResult {
    const chartData = this.extractChartData(result);
    
    if (!chartData.datasets || chartData.datasets.length === 0) {
      return {
        type: 'chart',
        template: 'empty',
        data: { message: 'No numeric data to chart' },
        rendered: '┌─────────────────────────┐\n│ No numeric data to chart │\n└─────────────────────────┘',
      };
    }

    const chartType = this.detectChartType(chartData);
    let rendered = '';

    switch (chartType) {
      case 'bar':
        rendered = this.renderBarChart(chartData);
        break;
      case 'horizontal':
        rendered = this.renderHorizontalBarChart(chartData);
        break;
      case 'sparkline':
        rendered = this.renderSparkline(chartData);
        break;
      default:
        rendered = this.renderBarChart(chartData);
    }

    return {
      type: 'chart',
      template: chartType,
      data: chartData,
      rendered,
    };
  }

  private renderInfographic(result: any): VisualizationResult {
    const sections: string[] = [];
    
    sections.push('╔════════════════════════════════════════════════════════════╗');
    sections.push('║                    INFORMATION OVERVIEW                     ║');
    sections.push('╠════════════════════════════════════════════════════════════╣');

    if (result.query) {
      sections.push(`║  Query: ${this.padCenter(result.query, 53)}║`);
    }

    if (result.sources && result.sources.length > 0) {
      sections.push(`║  Sources Found: ${this.padCenter(String(result.sources.length), 44)}║`);
    }

    if (result.metadata) {
      if (result.metadata.duration) {
        sections.push(`║  Duration: ${this.padCenter(result.metadata.duration + 'ms', 49)}║`);
      }
      if (result.metadata.strategy) {
        sections.push(`║  Strategy: ${this.padCenter(result.metadata.strategy, 48)}║`);
      }
    }

    sections.push('╠════════════════════════════════════════════════════════════╣');
    sections.push('║  KEY INSIGHTS                                               ║');
    
    if (result.summary) {
      const summaryLines = this.wrapText(result.summary, 59);
      for (const line of summaryLines.slice(0, 3)) {
        sections.push(`║  • ${this.padEnd(line, 58)}║`);
      }
    }

    sections.push('╠════════════════════════════════════════════════════════════╣');
    sections.push('║  TOP SOURCES                                                ║');
    
    const sources = (result.sources || []).slice(0, 5);
    for (const source of sources) {
      const title = source.title?.substring(0, 50) || 'Untitled';
      sections.push(`║  • ${this.padEnd(title, 58)}║`);
    }

    sections.push('╚════════════════════════════════════════════════════════════╝');

    return {
      type: 'infographic',
      template: 'default',
      data: result,
      rendered: sections.join('\n'),
    };
  }

  private renderText(result: any): VisualizationResult {
    const content = result.content || result.summary || 'No content available';
    
    return {
      type: 'text',
      template: 'default',
      data: { content },
      rendered: content,
    };
  }

  private renderBarChart(data: ChartData): string {
    const labels = data.labels || data.datasets?.[0]?.data.map((_, i) => `Item ${i + 1}`) || [];
    const values = data.datasets?.[0]?.data || [];
    
    if (values.length === 0) return 'No data';
    
    const maxValue = Math.max(...values);
    const chartHeight = 10;
    const chartWidth = 40;
    
    const lines: string[] = [];
    lines.push('');
    
    for (let h = chartHeight; h >= 0; h--) {
      const row: string[] = [];
      const threshold = (h / chartHeight) * maxValue;
      
      for (const value of values) {
        const filled = value >= threshold ? '█' : ' ';
        row.push(filled);
      }
      
      const label = h === 0 ? '└' : '│';
      lines.push(`${label} ${row.join(' ')} ${threshold.toFixed(0)}`);
    }
    
    lines.push('  ' + labels.map((_, i) => (i + 1).toString().padStart(1)).join(' '));
    
    return lines.join('\n');
  }

  private renderHorizontalBarChart(data: ChartData): string {
    const labels = data.labels || data.datasets?.[0]?.data.map((_, i) => `Item ${i + 1}`) || [];
    const values = data.datasets?.[0]?.data || [];
    const maxValue = Math.max(...values, 1);
    const barWidth = 30;
    
    const lines: string[] = [];
    lines.push('');

    for (let i = 0; i < Math.min(labels.length, 10); i++) {
      const filled = Math.round((values[i] / maxValue) * barWidth);
      const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
      const label = labels[i]?.substring(0, 15).padEnd(15);
      const value = values[i].toString().padStart(5);
      
      lines.push(`│ ${label} │ ${bar} │ ${value}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private renderSparkline(data: ChartData): string {
    const values = data.datasets?.[0]?.data || [];
    if (values.length === 0) return 'No data';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const height = 5;
    
    let sparkline = '';
    for (const value of values) {
      const normalized = Math.round(((value - min) / range) * (height - 1));
      sparkline += '░▁▂▃▄▅▆▇█'[normalized] || '░';
    }

    return `\n  ${sparkline}\n`;
  }

  private renderDefaultTemplate(data: any): string {
    return this.renderBarChart(this.extractChartData(data));
  }

  private renderMinimalTemplate(data: any): string {
    return this.renderSparkline(this.extractChartData(data));
  }

  private renderDetailedTemplate(data: any): string {
    return this.renderInfographic(data).rendered || '';
  }

  private extractChartData(result: any): ChartData {
    if (result.visualization?.data) {
      return result.visualization.data;
    }
    
    if (result.data && typeof result.data === 'object') {
      if (Array.isArray(result.data)) {
        return {
          labels: result.data.map((item: any, i: number) => item.label || item.name || `Item ${i + 1}`),
          datasets: [{
            data: result.data.map((item: any) => item.value || item.count || item.amount || 0),
          }],
        };
      }
      
      if (result.data.labels && result.data.values) {
        return {
          labels: result.data.labels,
          datasets: [{ data: result.data.values }],
        };
      }
    }
    
    return { datasets: [{ data: [] }] };
  }

  private detectChartType(data: ChartData): string {
    const values = data.datasets?.[0]?.data || [];
    const labelCount = data.labels?.length || 0;
    
    if (values.length === 0) return 'empty';
    if (values.length <= 3) return 'bar';
    if (values.length > 15) return 'sparkline';
    if (labelCount > 0 && labelCount < 10) return 'horizontal';
    
    return 'bar';
  }

  private padCenter(str: string, width: number): string {
    const padding = Math.max(0, width - str.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str.substring(0, width) + ' '.repeat(rightPad);
  }

  private padEnd(str: string, width: number): string {
    return (str + ' '.repeat(width)).substring(0, width);
  }

  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= width) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  registerTemplate(name: string, renderer: (data: any) => string): void {
    this.templates.set(name, renderer);
  }
}
