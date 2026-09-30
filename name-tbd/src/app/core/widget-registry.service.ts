import { Injectable, inject, signal } from '@angular/core';
import { WidgetPropDefinitionControllerService } from '../api/services/widgetPropDefinitionController.service';

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
  private api = inject(WidgetPropDefinitionControllerService);

  // Dictionary grouping props by widget type
  public propDefinitions = signal<Record<string, WidgetPropDefinition[]>>({});

  // Types whose definitions were already requested, so each type is fetched only once
  private requestedTypes = new Set<string>();

  loadDefinitionsForType(type: string) {
    if (this.requestedTypes.has(type)) return;
    this.requestedTypes.add(type);

    this.api.getDefinitionsByType(type)
      .subscribe({
        next: (defs) => this.propDefinitions.update((all) => ({ ...all, [type]: defs as WidgetPropDefinition[] })),
        error: (err) => {
          this.requestedTypes.delete(type);
          console.error(`Failed to load prop definitions for widget type "${type}"`, err);
        }
      });
  }

  getPropsForWidget(type: string): WidgetPropDefinition[] {
    const defs = this.propDefinitions();
    return [...(defs['global'] || []), ...(defs[type] || [])];
  }
}
