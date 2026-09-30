import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { EditorTabs } from './editor-tabs/editor-tabs';
import { ModeDropdown } from './mode-dropdown/mode-dropdown';

/** The editor shell: navbar, sidebars, tabs, and the active mode's view. */
@Component({
  selector: 'app-editor',
  imports: [RouterOutlet, Sidebar, Navbar, EditorTabs, ModeDropdown],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
