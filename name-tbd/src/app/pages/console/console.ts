import { Component } from '@angular/core';
import { ApplicationCard } from './application-card/application-card';
import { MOCK_APPLICATIONS } from '../../_constants/mock-applications.constants';

/** Overview of the user's applications (placeholder data for now). */
@Component({
  selector: 'app-application-console',
  imports: [ApplicationCard],
  templateUrl: './console.html',
  styleUrl: './console.scss',
})
export class ApplicationConsole {
  readonly applications = MOCK_APPLICATIONS;
}
