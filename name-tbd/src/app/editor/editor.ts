import { Component } from '@angular/core';
import { RecourseNavigation } from '../recourse-navigation/recourse-navigation';
import { Navbar } from '../navbar/navbar';
import { EditorTabs } from '../editor-tabs/editor-tabs';

@Component({
  selector: 'app-editor',
  imports: [RecourseNavigation, Navbar, EditorTabs],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
