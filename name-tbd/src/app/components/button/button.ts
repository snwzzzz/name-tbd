import { Component, input, booleanAttribute } from '@angular/core';
import { NgClass } from '@angular/common';

export type ButtonColor = 'primary' | 'secondary' | 'warning' | 'error' | 'success' | 'neutral';
export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgClass],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  color = input<ButtonColor>('primary');
  variant = input<ButtonVariant>('solid');
  size = input<ButtonSize>('md');
  disabled = input<boolean, unknown>(false, { transform: booleanAttribute });
}
