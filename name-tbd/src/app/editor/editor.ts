import { Component } from '@angular/core';
import { RecourseNavigation } from '../recourse-navigation/recourse-navigation';

@Component({
  selector: 'app-editor',
  imports: [RecourseNavigation],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {}
