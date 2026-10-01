import { Component, computed, input, output } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FFlowModule } from '@foblex/flow';
import {
  LucideFileText, LucideGitBranch, LucideWrench, LucideX, LucideZap,
} from '@lucide/angular';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { ACTION_TYPES, CONDITION_OPERATORS, widgetTrigger } from '../../../_constants/workflow.constants';
import { LayoutItem } from '../../../_types/layout.types';
import { SelectOption } from '../../../_types/select.types';
import { ActionConfig, Condition, FlowNode, TriggerNode } from '../../../_types/workflow.types';
import { propText } from '../../../_utils/widget-props.utils';
import { inputPortId, outputPortId } from '../../../_utils/port.utils';

const DEFAULT_BUTTON_COLOR = '#3b82f6';

const prop = (item: LayoutItem, key: string) => propText(item.props, key);

/**
 * One node of the workflow editor: header, the node type's settings, and its ports.
 * The editor puts Foblex's `fNode` on this component's host, so the ports below attach to it.
 */
@Component({
  selector: 'app-workflow-node',
  imports: [FormsModule, NgComponentOutlet, FFlowModule, UiSelect, LucideZap, LucideGitBranch, LucideWrench, LucideX],
  templateUrl: './workflow-node.html',
  styleUrl: './workflow-node.scss',
  host: {
    class: 'workflow-node',
    '[class.trigger-node]': "node().type === 'Trigger'",
    '[class.condition-node]': "node().type === 'Condition'",
    '[class.action-node]': "node().type === 'Action'",
  },
})
export class WorkflowNode {
  readonly node = input.required<FlowNode>();
  /** The page's widgets, for the button picker and the actions' pickers. */
  readonly pageItems = input.required<LayoutItem[]>();

  readonly changed = output<FlowNode>();
  readonly deleted = output<void>();

  readonly actionTypeOptions: SelectOption[] = ACTION_TYPES.map((a) => ({ value: a.id, label: a.label }));
  readonly operatorOptions: SelectOption[] = CONDITION_OPERATORS.map((o) => ({ value: o.id, label: o.label }));

  readonly title = computed(() => {
    const node = this.node();
    if (node.type === 'Trigger') {
      const widget = node.elementId ? this.pageItems().find((i) => i.id?.toString() === node.elementId) : undefined;
      return widgetTrigger(widget?.type)?.title ?? (node.elementId ? 'Trigger' : 'On page load');
    }
    return node.type;
  });

  /** Page load, then every widget event that can start a flow (see WIDGET_TRIGGERS). */
  readonly triggerOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'the page loads', icon: LucideFileText },
    ...this.pageItems().flatMap((i) => {
      const trigger = widgetTrigger(i.type);
      if (!trigger || typeof i.id !== 'number') return [];
      const name = `“${prop(i, trigger.nameProp) ?? trigger.widgetType}” (#${i.id})`;
      return [{ value: triggerKey(i.id.toString(), trigger.event), label: trigger.describe(name), icon: trigger.icon }];
    }),
  ]);

  /** The picker's value for the trigger: its widget and event. */
  readonly selectedTrigger = computed(() => {
    const trigger = this.trigger();
    return trigger?.elementId && trigger.eventName ? triggerKey(trigger.elementId, trigger.eventName) : '';
  });

  /** The widget a click trigger belongs to. */
  private readonly triggerElement = computed(() => {
    const node = this.node();
    const elementId = node.type === 'Trigger' ? node.elementId : undefined;
    return elementId ? this.pageItems().find((i) => i.id?.toString() === elementId) ?? null : null;
  });

  /** Label and color of the trigger's button, to draw it like it looks on the page. */
  readonly triggerButton = computed(() => {
    const item = this.triggerElement();
    if (item?.type !== 'button') return null;
    return { label: prop(item, 'label') ?? 'Click Me', color: prop(item, 'color') ?? DEFAULT_BUTTON_COLOR };
  });

  /** e.g. "Label “Hello”", for a trigger on an element that isn't a button. */
  readonly triggerElementName = computed(() => {
    const node = this.node();
    if (node.type !== 'Trigger' || !node.elementId) return null;
    const item = this.triggerElement();
    if (!item) return `Element #${node.elementId}`;
    const text = prop(item, widgetTrigger(item.type)?.nameProp ?? 'text') ?? prop(item, 'text');
    const type = (item.type ?? 'element').replace(/^./, (c) => c.toUpperCase());
    return text ? `${type} “${text}”` : `${type} #${item.id}`;
  });

  readonly inputPort = computed(() => inputPortId(this.node().id));

  outputPort(port: string): string {
    return outputPortId(this.node().id, port);
  }

  // ─── Typed views of the node for the template ────────────────────────────
  readonly trigger = computed(() => this.asType('Trigger'));
  readonly condition = computed(() => this.asType('Condition')?.condition ?? null);
  readonly action = computed(() => this.asType('Action'));
  /** The action's type, whose editor shows the action's settings. */
  readonly actionType = computed(() => ACTION_TYPES.find((a) => a.id === this.action()?.actionType) ?? null);

  // ─── Edits ───────────────────────────────────────────────────────────────
  /** Point a trigger at a widget's event, or back to page load when none is chosen. */
  setTrigger(key: string): void {
    const trigger = this.trigger();
    if (!trigger) return;
    const [elementId, eventName] = key.split('|');
    const updated: TriggerNode = key
      ? { ...trigger, triggerType: 'element_click', eventName, elementId }
      : { ...trigger, triggerType: 'page_load', eventName: undefined, elementId: undefined };
    this.changed.emit(updated);
  }

  updateCondition(patch: Partial<Condition>): void {
    const node = this.asType('Condition');
    if (node) this.changed.emit({ ...node, condition: { ...node.condition, ...patch } });
  }

  setActionType(actionType: string): void {
    const node = this.action();
    const type = ACTION_TYPES.find((a) => a.id === actionType);
    if (node && type) this.changed.emit({ ...node, actionType, config: { ...type.defaultConfig } });
  }

  /** Given to the action's editor (a stable function, so the editor isn't recreated on each change). */
  readonly updateConfig = (patch: Partial<ActionConfig>): void => {
    const node = this.action();
    if (node) this.changed.emit({ ...node, config: { ...node.config, ...patch } as ActionConfig });
  };

  private asType<T extends FlowNode['type']>(type: T): Extract<FlowNode, { type: T }> | null {
    const node = this.node();
    return node.type === type ? (node as Extract<FlowNode, { type: T }>) : null;
  }
}

/** A trigger picker value: the widget's id and the event, e.g. "4|element_click". */
const triggerKey = (elementId: string, event: string) => `${elementId}|${event}`;
