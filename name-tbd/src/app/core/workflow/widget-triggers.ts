import {
  LucideCalendar, LucideClipboardList, LucideHash, LucideLayoutList, LucideMousePointerClick, LucideSheet,
  LucideSquareCheck, LucideSquareChevronDown, LucideTextCursorInput, LucideToggleRight, LucideUpload,
} from '@lucide/angular';
import { WidgetTrigger } from '../../_types/workflow.types';
import {
  CHANGE_EVENT, CLICK_EVENT, INPUT_EVENT, ITEM_CLICK_EVENT, ROW_DOUBLE_CLICK_EVENT, SUBMIT_EVENT,
} from '../../_constants/widget-events.constants';

/** "On change" of a field that fires CHANGE_EVENT. */
const onChange = (widgetType: string, icon: WidgetTrigger['icon'], what: string): WidgetTrigger => ({
  widgetType,
  event: CHANGE_EVENT,
  title: 'On change',
  icon,
  nameProp: 'label',
  describe: (name) => `${what} ${name} is changed`,
});

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
  {
    widgetType: 'input',
    event: INPUT_EVENT,
    title: 'On input',
    icon: LucideTextCursorInput,
    nameProp: 'placeholder',
    describe: (name) => `something is typed into input ${name}`,
  },
  onChange('select', LucideSquareChevronDown, 'dropdown'),
  onChange('checkbox', LucideSquareCheck, 'checkbox'),
  onChange('toggle', LucideToggleRight, 'toggle'),
  onChange('number', LucideHash, 'number input'),
  onChange('date', LucideCalendar, 'date picker'),
  onChange('file', LucideUpload, 'file upload'),
  {
    widgetType: 'list',
    event: ITEM_CLICK_EVENT,
    title: 'On item click',
    icon: LucideLayoutList,
    nameProp: 'titleColumn',
    describe: (name) => `an item in list ${name} is clicked`,
  },
  {
    widgetType: 'form',
    event: SUBMIT_EVENT,
    title: 'On submit',
    icon: LucideClipboardList,
    nameProp: 'successMessage',
    describe: () => 'the form is saved',
  },
];

/** The trigger a widget type offers, if any. */
export const widgetTrigger = (widgetType: string | undefined): WidgetTrigger | undefined =>
  WIDGET_TRIGGERS.find((trigger) => trigger.widgetType === widgetType);
