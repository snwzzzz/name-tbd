import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RecourseNavigation } from '../recourse-navigation/recourse-navigation';
import { Navbar } from '../navbar/navbar';
import { EditorTabs } from '../editor-tabs/editor-tabs';
import { ModeDropdown } from '../mode-dropdown/mode-dropdown';

@Component({
  selector: 'app-editor',
  imports: [RouterOutlet, RecourseNavigation, Navbar, EditorTabs, ModeDropdown],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
