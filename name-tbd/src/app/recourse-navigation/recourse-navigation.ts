import { Component } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';
import { LucideLayoutList } from '@lucide/angular';

@Component({
  selector: 'app-recourse-navigation',
  imports: [IconButton],
  templateUrl: './recourse-navigation.html',
  styleUrl: './recourse-navigation.scss',
})
export class RecourseNavigation {
  isSidebarExpanded = false;

  layoutListIcon = LucideLayoutList;

  toggleSidebar() {
    this.isSidebarExpanded = !this.isSidebarExpanded;
  }
}
