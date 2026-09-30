import { Injectable, inject, signal } from '@angular/core';
import { WidgetPropDefinitionControllerService } from '../api/services/widgetPropDefinitionController.service';
import { WidgetPropDefinition } from '../_types/widget.types';

/** Definitions of the widget props that show up in the properties panel, loaded per widget type. */
@Injectable({ providedIn: 'root' })
export class WidgetRegistryService {
  private readonly api = inject(WidgetPropDefinitionControllerService);

  /** Definitions by widget type ('global' ones apply to every widget). */
  readonly propDefinitions = signal<Record<string, WidgetPropDefinition[]>>({});

  // Types already requested, so each type is fetched only once
  private readonly requestedTypes = new Set<string>();

  loadDefinitionsForType(type: string): void {
    if (this.requestedTypes.has(type)) return;
    this.requestedTypes.add(type);

    this.api.getDefinitionsByType(type).subscribe({
      // The generated type is looser (every field optional, propType any string) and has no options
      next: (defs) => this.propDefinitions.update((all) => ({ ...all, [type]: defs as WidgetPropDefinition[] })),
      error: (err) => {
        this.requestedTypes.delete(type);
        console.error(`Failed to load prop definitions for widget type "${type}"`, err);
      },
    });
  }

  getPropsForWidget(type: string): WidgetPropDefinition[] {
    const defs = this.propDefinitions();
    return [...(defs['global'] ?? []), ...(defs[type] ?? [])];
  }
}
