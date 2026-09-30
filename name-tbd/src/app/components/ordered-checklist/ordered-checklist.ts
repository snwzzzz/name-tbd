import { Component, booleanAttribute, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { LucideGripVertical } from '@lucide/angular';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

/**
 * Checkboxes that can be dragged into order (e.g. which columns or pages to show, and in what
 * order). Emits the whole list after every toggle or move.
 */
@Component({
  selector: 'app-ordered-checklist',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, LucideGripVertical],
  template: `
    <div class="choices" cdkDropList (cdkDropListDropped)="reorder($event)">
      @for (item of items(); track item.id) {
        <label class="ui-check choice" cdkDrag cdkDragLockAxis="y">
          <input
            type="checkbox"
            [checked]="item.checked"
            [disabled]="keepOneChecked() && item.checked && checkedCount() === 1"
            (change)="toggle(item.id)" />
          <span class="name">{{ item.label }}</span>
          <span class="drag-handle" cdkDragHandle title="Drag to reorder"><svg lucideGripVertical></svg></span>
        </label>
      }
    </div>
  `,
  styleUrl: './ordered-checklist.scss',
})
export class OrderedChecklist {
  readonly items = input.required<ChecklistItem[]>();
  /** The last checked item can't be unchecked. */
  readonly keepOneChecked = input(false, { transform: booleanAttribute });
  readonly changed = output<ChecklistItem[]>();

  readonly checkedCount = computed(() => this.items().filter((item) => item.checked).length);

  toggle(id: string): void {
    this.changed.emit(this.items().map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  }

  reorder(event: CdkDragDrop<ChecklistItem[]>): void {
    const items = [...this.items()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.changed.emit(items);
  }
}
