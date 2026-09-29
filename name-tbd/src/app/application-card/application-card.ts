import { Component, input } from '@angular/core';
import { Application } from '../_types/application';
import { LucidePencil, LucidePlay, LucideSettings } from '@lucide/angular';

@Component({
  selector: 'app-application-card',
  imports: [LucidePlay, LucideSettings, LucidePencil],
  templateUrl: './application-card.html',
  styleUrl: './application-card.scss',
})
export class ApplicationCard {
  readonly application = input.required<Application>();
}
