import { Component } from '@angular/core';
import { LucideLayoutTemplate } from '@lucide/angular';
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-mode-dropdown',
  imports: [NgComponentOutlet],
  templateUrl: './mode-dropdown.html',
  styleUrl: './mode-dropdown.scss',
})
export class ModeDropdown {
  iconMode = LucideLayoutTemplate;
}
