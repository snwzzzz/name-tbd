import { Component, input, Input, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIcon } from '@lucide/angular';

@Component({
  selector: 'app-icon-button',
  imports: [CommonModule],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
})
export class IconButton {
  icon = input.required<LucideIcon | null>();
  selected = input<boolean>(false);
}
