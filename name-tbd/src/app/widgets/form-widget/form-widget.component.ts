import { Component, ElementRef, inject, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-form-widget',
  standalone: true,
  templateUrl: './form-widget.component.html',
  styleUrl: './form-widget.component.scss'
})
export class FormWidgetComponent {
  inputCount = 1;
  private el = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  addInput() {
    this.inputCount++;
    this.cdr.detectChanges(); // Ensure Angular updates the DOM immediately
    
    // Use setTimeout to allow browser layout to complete
    setTimeout(() => {
      const itemEl = this.el.nativeElement.closest('.grid-stack-item') as any;
      const gridEl = this.el.nativeElement.closest('.grid-stack') as any;
      
      console.log('Form widget resizing. itemEl:', itemEl, 'gridEl:', gridEl);
      
      const gridInstance = itemEl?.gridstackNode?.grid || gridEl?.gridstack;
      
      if (itemEl && gridInstance) {
        gridInstance.resizeToContent(itemEl);
      }
    }, 0);
  }
  
  getInputs() {
    return Array.from({ length: this.inputCount });
  }
}
