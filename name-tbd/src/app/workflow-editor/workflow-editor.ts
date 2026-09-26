import { Component } from '@angular/core';

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  template: `
    <div class="workflow-editor-container">
      <h2>Workflow Editor</h2>
      <p>This is the workflow editor view.</p>
    </div>
  `,
  styles: `
    .workflow-editor-container {
      padding: 2rem;
      height: 100%;
      background: var(--color-bg-canvas);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
    }
  `
})
export class WorkflowEditor {}
