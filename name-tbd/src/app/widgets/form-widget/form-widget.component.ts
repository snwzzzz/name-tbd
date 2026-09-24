import { Component } from '@angular/core';

@Component({
  selector: 'app-form-widget',
  standalone: true,
  templateUrl: './form-widget.component.html',
  styleUrl: './form-widget.component.scss'
})
export class FormWidgetComponent {
  inputCount = 1;

  addInput() {
    this.inputCount++;
    // The resize logic will be handled by GridStack if sizeToContent is true,
    // or by a ResizeObserver in a real implementation. For this PoC:
    setTimeout(() => {
      const btn = document.activeElement as HTMLElement;
      if (btn && (window as any).resizeGridItem) {
        (window as any).resizeGridItem(btn);
      }
    }, 0);
  }
  
  getInputs() {
    return Array.from({ length: this.inputCount });
  }
}
