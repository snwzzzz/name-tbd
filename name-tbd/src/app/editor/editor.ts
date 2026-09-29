import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RecourseNavigation } from '../recourse-navigation/recourse-navigation';
import { Navbar } from '../navbar/navbar';
import { EditorTabs } from '../editor-tabs/editor-tabs';
import { ModeDropdown } from '../mode-dropdown/mode-dropdown';
import { InspectorPanel } from '../inspector-panel/inspector-panel';

@Component({
  selector: 'app-editor',
  imports: [RouterOutlet, RecourseNavigation, Navbar, EditorTabs, ModeDropdown, InspectorPanel],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
