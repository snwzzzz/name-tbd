import { Component } from '@angular/core';

/** A separator line between groups of context menu entries. */
@Component({
  selector: 'app-context-menu-divider',
  templateUrl: './context-menu-divider.html',
  styleUrl: './context-menu-divider.scss',
  host: { role: 'separator' },
})
export class ContextMenuDivider {}
