import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface WidgetPropDefinition {
  id: number;
  widgetType: string;
  propKey: string;
  propType: 'string' | 'number' | 'color' | 'boolean' | 'select';
  defaultValue: string;
}

@Injectable({
  providedIn: 'root'
})
export class WidgetRegistryService {
  private http = inject(HttpClient);
  
  // Dictionary grouping props by widget type
  public propDefinitions = signal<Record<string, WidgetPropDefinition[]>>({});

  loadDefinitions() {
    // Fetches the standardized props from our new API route
    this.http.get<Record<string, WidgetPropDefinition[]>>('/api/widget-props')
      .subscribe({
        next: (defs) => this.propDefinitions.set(defs),
        error: (err) => console.error('Failed to load widget prop definitions', err)
      });
  }

  getPropsForWidget(type: string): WidgetPropDefinition[] {
    const defs = this.propDefinitions();
    // Return specific props + global props (if you define a 'global' type)
    return [...(defs['global'] || []), ...(defs[type] || [])];
  }
}
