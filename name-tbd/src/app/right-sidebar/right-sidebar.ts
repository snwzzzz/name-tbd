import { Component } from '@angular/core';
import { InspectorPanel } from '../inspector-panel/inspector-panel';

@Component({
  selector: 'app-right-sidebar',
  imports: [InspectorPanel],
  templateUrl: './right-sidebar.html',
  styleUrl: './right-sidebar.scss',
})
export class RightSidebar {}
