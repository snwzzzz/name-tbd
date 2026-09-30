import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface WidgetPropDefinition {
  id: number;
  widgetType: string;
  propKey: string;
  propType: 'string' | 'number' | 'color' | 'boolean' | 'select' | 'textarea';
  defaultValue: string;
  label?: string;
  options?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class WidgetRegistryService {
  private http = inject(HttpClient);
  
  // Dictionary grouping props by widget type
  public propDefinitions = signal<Record<string, WidgetPropDefinition[]>>({});

  loadDefinitions() {
    this.http.get<Record<string, WidgetPropDefinition[]>>('/api/widget-props')
      .subscribe({
        next: (defs) => this.propDefinitions.set(defs),
        error: (err) => console.error('Failed to load widget prop definitions', err)
      });
  }

  getPropsForWidget(type: string): WidgetPropDefinition[] {
    const defs = this.propDefinitions();
    return [...(defs['global'] || []), ...(defs[type] || [])];
  }
}
