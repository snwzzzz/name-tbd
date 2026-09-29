export interface OperatorRegistryItem {
  id: string;
  label: string;
  requiresValue: boolean;
}

export const CONDITION_OPERATORS: OperatorRegistryItem[] = [
  { id: 'equals', label: 'Equals', requiresValue: true },
  { id: 'notEquals', label: 'Not Equals', requiresValue: true },
  { id: 'greaterThan', label: 'Greater Than', requiresValue: true },
  { id: 'lessThan', label: 'Less Than', requiresValue: true },
  { id: 'contains', label: 'Contains', requiresValue: true },
  { id: 'isTrue', label: 'Is True', requiresValue: false },
  { id: 'isFalse', label: 'Is False', requiresValue: false },
];

export interface ActionRegistryItem {
  id: string;
  label: string;
  defaultConfig: Record<string, any>;
}

export const ACTION_TYPES: ActionRegistryItem[] = [
  { id: 'show_message', label: 'Show Message', defaultConfig: { message: '' } },
  { id: 'navigate', label: 'Navigate to Page', defaultConfig: { url: '' } },
  { id: 'hide_element', label: 'Hide Element', defaultConfig: { elementId: '' } },
];
