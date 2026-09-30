import { Component, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LucideIcon } from '@lucide/angular';

@Component({
  selector: 'app-icon-button',
  imports: [NgComponentOutlet],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
})
export class IconButton {
  readonly icon = input.required<LucideIcon | null>();
  readonly selected = input(false);
}
