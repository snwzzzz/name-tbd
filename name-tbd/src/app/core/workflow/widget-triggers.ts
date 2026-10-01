import { LucideMousePointerClick, LucideSheet } from '@lucide/angular';
import { WidgetTrigger } from '../../_types/workflow.types';
import { CLICK_EVENT, ROW_DOUBLE_CLICK_EVENT } from '../../_constants/widget-events.constants';

/**
 * The widget events that can start a flow: they're offered in the trigger node and in the
 * canvas's "Add action" menu. A new one is added by adding an entry (and firing it from its widget).
 */
export const WIDGET_TRIGGERS: WidgetTrigger[] = [
  {
    widgetType: 'button',
    event: CLICK_EVENT,
    title: 'On click',
    icon: LucideMousePointerClick,
    nameProp: 'label',
    describe: (name) => `button ${name} is clicked`,
  },
  {
    widgetType: 'table',
    event: ROW_DOUBLE_CLICK_EVENT,
    title: 'On row double-click',
    icon: LucideSheet,
    nameProp: 'title',
    describe: (name) => `a row in table ${name} is double-clicked`,
  },
];

/** The trigger a widget type offers, if any. */
export const widgetTrigger = (widgetType: string | undefined): WidgetTrigger | undefined =>
  WIDGET_TRIGGERS.find((trigger) => trigger.widgetType === widgetType);
