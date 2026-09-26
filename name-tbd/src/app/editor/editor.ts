import { Component } from '@angular/core';
import { RecourseNavigation } from '../recourse-navigation/recourse-navigation';
import { Navbar } from '../navbar/navbar';
import { EditorTabs } from '../editor-tabs/editor-tabs';
import { ModeDropdown } from '../mode-dropdown/mode-dropdown';
import { Canvas } from '../canvas/canvas';

@Component({
  selector: 'app-editor',
  imports: [RecourseNavigation, Navbar, EditorTabs, ModeDropdown, Canvas],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
