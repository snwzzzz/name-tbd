import { Component, computed, input, output } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FFlowModule } from '@foblex/flow';
import {
  LucideFileText, LucideGitBranch, LucideTimer, LucideVariable, LucideWrench, LucideX, LucideZap,
} from '@lucide/angular';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { ACTION_GROUPS, ACTION_TYPES, actionPorts, widgetTrigger } from '../../../_constants/workflow.constants';
import { ExpressionInput } from '../../../components/expression-input/expression-input';
import { ScopeEntry, VariableDefinition, conditionExpression } from '../../../../flow-engine';
import { LayoutItem } from '../../../_types/layout.types';
import { SelectOption } from '../../../_types/select.types';
import { ActionConfig, FlowNode, TriggerNode } from '../../../_types/workflow.types';
import { propText } from '../../../_utils/widget-props.utils';
import { inputPortId, outputPortId } from '../../../_utils/port.utils';
import { BUTTON_DEFAULT_COLOR } from '../../../widgets/button-widget/button-widget';


const prop = (item: LayoutItem, key: string) => propText(item.props, key);

/**
 * One node of the workflow editor: header, the node type's settings, and its ports.
 * The editor puts Foblex's `fNode` on this component's host, so the ports below attach to it.
 */
@Component({
  selector: 'app-workflow-node',
  imports: [FormsModule, NgComponentOutlet, FFlowModule, UiSelect, ExpressionInput, LucideZap, LucideGitBranch, LucideWrench, LucideX],
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
  /** The page's widgets, for the actions' pickers. */
  readonly pageItems = input.required<LayoutItem[]>();
  /**
   * The widgets whose events can start this page's flows: its own, and the layout page's (shown
   * around it, e.g. a search bar in the header; their events run the open page's flows).
   */
  readonly triggerItems = input<LayoutItem[]>([]);
  /** The page the workflow belongs to. */
  readonly pageId = input<string>('');
  /** What the node's expressions can use (the page's names and the flow's own values). */
  readonly scope = input<ScopeEntry[]>([]);
  /** The variables the page sees (for the "variable changes" trigger). */
  readonly variables = input<VariableDefinition[]>([]);

  readonly changed = output<FlowNode>();
  readonly deleted = output<void>();

  /** In the groups' order (Page, Forms, Data, Logic, Connections). */
  readonly actionTypeOptions: SelectOption[] = ACTION_GROUPS.flatMap((group) =>
    ACTION_TYPES.filter((a) => a.group === group).map((a) => ({ value: a.id, label: `${group}: ${a.label}` })));

  readonly title = computed(() => {
    const node = this.node();
    if (node.type === 'Trigger') {
      const widget = node.elementId ? this.triggerItems().find((i) => i.id?.toString() === node.elementId) : undefined;
      if (node.triggerType === 'timer') return 'On a timer';
      if (node.triggerType === 'variable_change') return 'On variable change';
      return widgetTrigger(widget?.type)?.title ?? (node.elementId ? 'Trigger' : 'On page load');
    }
    if (node.type === 'Action') return ACTION_TYPES.find((a) => a.id === node.actionType)?.label ?? 'Action';
    return node.type;
  });

  /** Page load, then every widget event that can start a flow (see WIDGET_TRIGGERS). */
  readonly triggerOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'the page loads', icon: LucideFileText },
    { value: TIMER_KEY, label: 'every few seconds, while the page is open', icon: LucideTimer },
    ...this.variables().map((v) => ({ value: `${VARIABLE_KEY}${v.name}`, label: `variable ${v.name} changes`, icon: LucideVariable })),
    ...this.triggerItems().flatMap((i) => {
      const trigger = widgetTrigger(i.type);
      if (!trigger || typeof i.id !== 'number') return [];
      const name = `“${prop(i, trigger.nameProp) ?? trigger.widgetType}” (#${i.id})`;
      return [{ value: triggerKey(i.id.toString(), trigger.event), label: trigger.describe(name), icon: trigger.icon }];
    }),
  ]);

  /** The picker's value for the trigger: its widget and event. */
  readonly selectedTrigger = computed(() => {
    const trigger = this.trigger();
    if (trigger?.triggerType === 'timer') return TIMER_KEY;
    if (trigger?.triggerType === 'variable_change') return `${VARIABLE_KEY}${trigger.variable ?? ''}`;
    return trigger?.elementId && trigger.eventName ? triggerKey(trigger.elementId, trigger.eventName) : '';
  });

  /** The widget a click trigger belongs to. */
  private readonly triggerElement = computed(() => {
    const node = this.node();
    const elementId = node.type === 'Trigger' ? node.elementId : undefined;
    return elementId ? this.triggerItems().find((i) => i.id?.toString() === elementId) ?? null : null;
  });

  /** Label and color of the trigger's button, to draw it like it looks on the page. */
  readonly triggerButton = computed(() => {
    const item = this.triggerElement();
    if (item?.type !== 'button') return null;
    return { label: prop(item, 'label') ?? 'Click Me', color: prop(item, 'color') ?? BUTTON_DEFAULT_COLOR };
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
  /** A condition's expression (one stored as field, operator and value shows as the expression it means). */
  readonly condition = computed(() => {
    const node = this.asType('Condition');
    return node ? conditionExpression(node) : null;
  });
  /** The action's outputs (most have one). */
  readonly ports = computed(() => actionPorts(this.action()?.actionType ?? ''));
  readonly action = computed(() => this.asType('Action'));
  /** The action's type, whose editor shows the action's settings. */
  readonly actionType = computed(() => ACTION_TYPES.find((a) => a.id === this.action()?.actionType) ?? null);

  // ─── Edits ───────────────────────────────────────────────────────────────
  /** Point a trigger at a widget's event, or back to page load when none is chosen. */
  setTrigger(key: string): void {
    const trigger = this.trigger();
    if (!trigger) return;
    const base = { ...trigger, eventName: undefined, elementId: undefined, variable: undefined, intervalSeconds: undefined };
    let updated: TriggerNode;
    if (key === TIMER_KEY) {
      updated = { ...base, triggerType: 'timer', intervalSeconds: trigger.intervalSeconds ?? 10 };
    } else if (key.startsWith(VARIABLE_KEY)) {
      updated = { ...base, triggerType: 'variable_change', variable: key.slice(VARIABLE_KEY.length) };
    } else if (key) {
      const [elementId, eventName] = key.split('|');
      updated = { ...base, triggerType: 'element_click', eventName, elementId };
    } else {
      updated = { ...base, triggerType: 'page_load' };
    }
    this.changed.emit(updated);
  }

  setInterval(seconds: number): void {
    const trigger = this.trigger();
    if (trigger) this.changed.emit({ ...trigger, intervalSeconds: Math.max(1, Number(seconds) || 1) });
  }

  /** The condition as an expression (a stored field/operator/value is replaced by it). */
  setCondition(expression: string): void {
    const node = this.asType('Condition');
    if (node) this.changed.emit({ ...node, expression, condition: undefined });
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

/** Trigger picker values that aren't a widget's event. */
const TIMER_KEY = 'timer';
const VARIABLE_KEY = 'variable:';

/** A trigger picker value: the widget's id and the event, e.g. "4|element_click". */
const triggerKey = (elementId: string, event: string) => `${elementId}|${event}`;
