import { Component, booleanAttribute, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LucideIcon } from '@lucide/angular';

/** An entry of a context menu: `<button app-context-menu-item [icon]="…">Label</button>`. */
@Component({
  selector: 'button[app-context-menu-item]',
  imports: [NgComponentOutlet],
  templateUrl: './context-menu-item.html',
  styleUrl: './context-menu-item.scss',
  host: {
    type: 'button',
    role: 'menuitem',
    '[class.danger]': 'danger()',
  },
})
export class ContextMenuItem {
  readonly icon = input<LucideIcon | null>(null);
  readonly danger = input(false, { transform: booleanAttribute });
}
