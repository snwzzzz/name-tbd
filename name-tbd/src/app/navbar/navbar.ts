import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideMoon, LucideSun, LucideDownload, LucideSearch } from '@lucide/angular';
import { TabsService } from '../services/tabs.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideMoon, LucideSun, LucideDownload, LucideSearch],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  isDarkMode = false;
  private tabsService = inject(TabsService);

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  exportPage() {
    const pageId = this.tabsService.activeTabId();
    if (pageId) {
      window.open(`http://localhost:8080/api/export/page/${pageId}`, '_blank');
    } else {
      alert("No active page to export!");
    }
  }
}

