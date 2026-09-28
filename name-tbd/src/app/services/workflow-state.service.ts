import { Injectable, signal, inject } from '@angular/core';
import { FlowNode, FlowConnection, TriggerNode } from '../workflow-editor/workflow.types';
import { WorkflowControllerService } from '../api/services/workflowController.service';

export interface WorkflowState {
  nodes: FlowNode[];
  connections: FlowConnection[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowStateService {
  private workflowService = inject(WorkflowControllerService);
  
  // Store workflow graphs by workflowId
  private graphs = signal<Record<string, WorkflowState>>({});

  loadGraphForTab(workflowId: string) {
    if (this.graphs()[workflowId]) return; // already loaded

    this.workflowService.getNodes(Number(workflowId)).subscribe(data => {
      const nodesDto = Array.isArray(data) ? data : [];
      // Convert DTOs to FlowNodes
      const nodes: FlowNode[] = nodesDto.map(dto => {
        const base = {
          id: dto.id!.toString(),
          position: { x: dto.x || 100, y: dto.y || 100 }
        };
        if (dto.type === 'Trigger') return { ...base, type: 'Trigger', ...dto.props } as any;
        if (dto.type === 'Condition') return { ...base, type: 'Condition', ...dto.props } as any;
        return { ...base, type: 'Action', ...dto.props } as any;
      });
      
      this.graphs.update(g => ({
        ...g,
        [workflowId]: { nodes, connections: [] } // Edges loading can be added later
      }));
    });
  }

  getGraphForTab(workflowId: string): WorkflowState {
    const currentGraphs = this.graphs();
    if (!currentGraphs[workflowId]) {
      return { nodes: [], connections: [] };
    }
    return currentGraphs[workflowId];
  }

  updateGraphForTab(workflowId: string, state: WorkflowState) {
    this.graphs.update(g => ({ ...g, [workflowId]: state }));
    // Ideally we should diff and call API to update nodes
    // For simplicity, if we know which node moved, we should just update it
  }

  // Adding node to API
  addNodeToAPI(workflowId: string, node: FlowNode) {
    const props = Object.keys(node).reduce((acc: any, key) => {
      if (!['id', 'type', 'position'].includes(key)) acc[key] = (node as any)[key];
      return acc;
    }, {});

    this.workflowService.createNode(Number(workflowId), {
      workflowId: Number(workflowId),
      type: node.type,
      props,
      x: node.position.x,
      y: node.position.y
    }).subscribe(dto => {
      if (dto && dto.id) {
        const newId = dto.id.toString();
        this.graphs.update(g => {
          const graph = g[workflowId];
          if (!graph) return g;
          const nodes = graph.nodes.map(n => n.id === node.id ? { ...n, id: newId } : n);
          return { ...g, [workflowId]: { ...graph, nodes } };
        });
      }
    });
  }

  updateNodeInAPI(workflowId: string, node: FlowNode) {
    if (node.id.startsWith('trigger-') || node.id.startsWith('node-')) return; // ignore local-only temporary IDs if any
    
    const props = Object.keys(node).reduce((acc: any, key) => {
      if (!['id', 'type', 'position'].includes(key)) acc[key] = (node as any)[key];
      return acc;
    }, {});

    this.workflowService.updateNode(Number(workflowId), Number(node.id), {
      props,
      x: node.position.x,
      y: node.position.y
    }).subscribe();
  }

  addTriggerForElement(workflowId: string, elementId: string, eventType: string = 'element_click'): string {
    const graph = this.getGraphForTab(workflowId);
    
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

    const newState = { ...graph, nodes: [...graph.nodes, newNode] };
    this.updateGraphForTab(workflowId, newState);
    
    // Attempt to persist
    this.addNodeToAPI(workflowId, newNode);

    return newNode.id;
  }
}
