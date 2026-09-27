import { Injectable, signal, computed } from '@angular/core';
import { FlowNode, FlowConnection, TriggerNode } from '../workflow-editor/workflow.types';

export interface WorkflowState {
  nodes: FlowNode[];
  connections: FlowConnection[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowStateService {
  // Store workflow graphs by tabId
  private graphs = signal<Record<string, WorkflowState>>({});

  constructor() {
    this.loadState();
  }

  private loadState() {
    const saved = localStorage.getItem('ide-workflows');
    if (saved) {
      try {
        this.graphs.set(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse workflows from local storage', e);
      }
    }
  }

  private saveState() {
    localStorage.setItem('ide-workflows', JSON.stringify(this.graphs()));
  }

  // Gets the state for a specific tab, initializing it if it doesn't exist
  getGraphForTab(tabId: string): WorkflowState {
    const currentGraphs = this.graphs();
    if (!currentGraphs[tabId]) {
      return { nodes: [], connections: [] };
    }
    return currentGraphs[tabId];
  }

  updateGraphForTab(tabId: string, state: WorkflowState) {
    this.graphs.update(g => {
      const updated = { ...g, [tabId]: state };
      return updated;
    });
    this.saveState();
  }

  /**
   * Adds a trigger node for a specific UI element if one does not already exist.
   * Returns the ID of the new or existing trigger node.
   */
  addTriggerForElement(tabId: string, elementId: string, eventType: string = 'element_click'): string {
    const graph = this.getGraphForTab(tabId);
    
    // Check if trigger already exists
    const existingTrigger = graph.nodes.find(n => 
      n.type === 'Trigger' && 
      (n as TriggerNode).elementId === elementId &&
      (n as TriggerNode).eventName === eventType
    );

    if (existingTrigger) {
      return existingTrigger.id;
    }

    const newNode: TriggerNode = {
      id: `trigger-${Date.now()}`,
      type: 'Trigger',
      triggerType: 'element_click',
      elementId,
      eventName: eventType,
      position: { x: 100, y: 100 }
    };

    this.updateGraphForTab(tabId, {
      ...graph,
      nodes: [...graph.nodes, newNode]
    });

    return newNode.id;
  }
}
