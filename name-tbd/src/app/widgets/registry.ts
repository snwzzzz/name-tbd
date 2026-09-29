import { WidgetDefinition } from '../core/widget.types';
import { ButtonWidgetComponent } from './button-widget/button-widget.component';
import { ButtonSettingsComponent } from './button-widget/button-settings.component';
import { FormWidgetComponent } from './form-widget/form-widget.component';
import { DefaultWidgetComponent } from './default-widget/default-widget.component';
import { LabelWidgetComponent } from './label-widget/label-widget.component';
import { LabelSettingsComponent } from './label-widget/label-settings.component';

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  button: {
    type: 'button',
    name: 'Button',
    icon: 'ph-hand-pointing',
    defaultProps: { label: 'Click Me', color: '#007bff' },
    component: ButtonWidgetComponent,
    settingsComponent: ButtonSettingsComponent,
  },
  label: {
    type: 'label',
    name: 'Text Label',
    icon: 'ph-text-t',
    defaultProps: { text: 'New Label', color: '#ffffff' },
    component: LabelWidgetComponent,
    settingsComponent: LabelSettingsComponent,
  },
  form: {
    type: 'form',
    name: 'Form Container',
    icon: 'ph-textbox',
    defaultProps: {},
    component: FormWidgetComponent,
  },
  default: {
    type: 'default',
    name: 'Unknown Widget',
    icon: 'ph-question',
    defaultProps: {},
    component: DefaultWidgetComponent,
  }
};
