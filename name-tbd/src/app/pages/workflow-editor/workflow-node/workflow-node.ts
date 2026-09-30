import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FFlowModule } from '@foblex/flow';
import {
  LucideFileText, LucideGitBranch, LucideMousePointerClick, LucideType, LucideWrench, LucideX, LucideZap,
} from '@lucide/angular';
import { UiSelect } from '../../../components/ui-select/ui-select';
import { ACTION_TYPES, CLICK_EVENT, CONDITION_OPERATORS } from '../../../_constants/workflow.constants';
import { LayoutItem } from '../../../_types/layout.types';
import { SelectOption } from '../../../_types/select.types';
import { Condition, FlowNode, SetTextConfig, TriggerNode } from '../../../_types/workflow.types';
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
  imports: [FormsModule, FFlowModule, UiSelect, LucideZap, LucideGitBranch, LucideWrench, LucideX],
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
  /** The page's widgets, for the button and label pickers. */
  readonly pageItems = input.required<LayoutItem[]>();

  readonly changed = output<FlowNode>();
  readonly deleted = output<void>();

  readonly actionTypeOptions: SelectOption[] = ACTION_TYPES.map((a) => ({ value: a.id, label: a.label }));
  readonly operatorOptions: SelectOption[] = CONDITION_OPERATORS.map((o) => ({ value: o.id, label: o.label }));

  readonly title = computed(() => {
    const node = this.node();
    if (node.type === 'Trigger') return node.eventName === CLICK_EVENT ? 'On click' : 'Trigger';
    return node.type;
  });

  readonly triggerOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'the page loads', icon: LucideFileText },
    ...this.pageItems()
      .filter((i) => i.type === 'button' && typeof i.id === 'number')
      .map((i) => ({
        value: i.id!.toString(),
        label: `button “${prop(i, 'label') ?? 'Click Me'}” (#${i.id}) is clicked`,
        icon: LucideMousePointerClick,
      })),
  ]);

  readonly labelOptions = computed<SelectOption[]>(() =>
    this.pageItems()
      .filter((i) => i.type === 'label' && typeof i.id === 'number')
      .map((i) => ({ value: i.id!.toString(), label: `${prop(i, 'text') ?? 'New Label'} (#${i.id})`, icon: LucideType })));

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
    const text = prop(item, 'text');
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
  readonly setText = computed<SetTextConfig | null>(() => {
    const action = this.action();
    return action?.actionType === 'set_text' ? action.config : null;
  });

  // ─── Edits ───────────────────────────────────────────────────────────────
  /** Point a trigger at a button's click, or back to page load when no button is chosen. */
  setTriggerElement(elementId: string): void {
    const trigger = this.trigger();
    if (!trigger) return;
    const updated: TriggerNode = elementId
      ? { ...trigger, triggerType: 'element_click', eventName: CLICK_EVENT, elementId }
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

  updateSetText(patch: Partial<SetTextConfig>): void {
    const node = this.action();
    if (node) this.changed.emit({ ...node, config: { ...node.config, ...patch } });
  }

  private asType<T extends FlowNode['type']>(type: T): Extract<FlowNode, { type: T }> | null {
    const node = this.node();
    return node.type === type ? (node as Extract<FlowNode, { type: T }>) : null;
  }
}
