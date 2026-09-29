import { Directive, input, model } from '@angular/core';

@Directive()
export abstract class BaseWidget {
  // Required input provided by the canvas
  id = input.required<string>();
  
  // Two-way bound props
  props = model<Record<string, any>>({});
  
  // Optional state if the canvas wants to highlight it
  selected = input<boolean>(false);
}

@Directive()
export abstract class BaseWidgetSettings {
  // Two-way bound props for the settings panel to mutate
  props = model.required<Record<string, any>>();
}
