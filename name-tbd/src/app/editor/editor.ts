import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ResourceNavigation } from './resource-navigation/resource-navigation';
import { Navbar } from './navbar/navbar';
import { EditorTabs } from './editor-tabs/editor-tabs';
import { ModeDropdown } from './mode-dropdown/mode-dropdown';
import { InspectorPanel } from './inspector-panel/inspector-panel';

/** The editor shell: navbar, sidebars, tabs, and the active mode's view. */
@Component({
  selector: 'app-editor',
  imports: [RouterOutlet, ResourceNavigation, Navbar, EditorTabs, ModeDropdown, InspectorPanel],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
