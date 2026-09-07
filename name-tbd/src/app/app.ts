import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Application } from './_types/application';
import { ApplicationCard } from './application-card/application-card';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ApplicationCard],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  applications: Application[] = [
    {
      id: 'app-001',
      title: 'Customer Portal',
      description: 'Self-service portal for customers to manage their accounts and subscriptions.',
      currentBranch: 'main',
      otherBranches: ['feature/dark-mode', 'feature/billing-v2', 'hotfix/login-bug'],
      lastModified: '2026-08-14T10:32:00Z',
      lastModifiedBy: 'sarah.chen',
      isOccupied: true,
    },
    {
      id: 'app-002',
      title: 'Inventory Management System',
      description:
        'Tracks stock levels, orders, and warehouse locations across all distribution centers.',
      currentBranch: 'develop',
      otherBranches: ['feature/barcode-scan', 'release/2.3.0'],
      lastModified: '2026-09-01T15:47:22Z',
      lastModifiedBy: 'james.okafor',
      isOccupied: true,
    },
    {
      id: 'app-003',
      title: 'Marketing Analytics Dashboard',
      description:
        'Visualizes campaign performance, conversion rates, and ROI across marketing channels.',
      currentBranch: 'main',
      otherBranches: [],
      lastModified: '2026-07-29T08:15:03Z',
      lastModifiedBy: 'priya.natarajan',
      isOccupied: false,
    },
    {
      id: 'app-004',
      title: 'HR Onboarding Tool',
      description:
        'Streamlines new hire paperwork, training schedules, and equipment provisioning.',
      currentBranch: 'feature/document-upload',
      otherBranches: ['main', 'develop', 'feature/e-signature'],
      lastModified: '2026-09-05T12:00:45Z',
      lastModifiedBy: 'mateo.garcia',
      isOccupied: false,
    },
    {
      id: 'app-005',
      title: 'Internal Wiki',
      description: 'Central knowledge base for engineering documentation and team processes.',
      currentBranch: 'main',
      otherBranches: ['feature/search-improvements'],
      lastModified: '2026-06-11T19:22:10Z',
      lastModifiedBy: 'olivia.brennan',
      isOccupied: false,
    },
    {
      id: 'app-006',
      title: 'Payment Gateway Service',
      description:
        'Handles transaction processing, refunds, and third-party payment provider integrations.',
      currentBranch: 'release/4.1.0',
      otherBranches: ['main', 'develop', 'hotfix/stripe-webhook', 'feature/paypal-support'],
      lastModified: '2026-09-06T21:05:57Z',
      lastModifiedBy: 'kenji.tanaka',
      isOccupied: true,
    },
    {
      id: 'app-007',
      title: 'Fleet Tracking App',
      description: 'Real-time GPS tracking and route optimization for delivery vehicles.',
      currentBranch: 'develop',
      otherBranches: ['feature/eta-prediction'],
      lastModified: '2026-08-22T06:40:18Z',
      lastModifiedBy: 'amara.okonkwo',
      isOccupied: false,
    },
    {
      id: 'app-008',
      title: 'Recipe Sharing Platform',
      description: 'Community-driven app for uploading, rating, and discovering new recipes.',
      currentBranch: 'main',
      otherBranches: ['feature/video-upload', 'feature/meal-planner', 'bugfix/rating-overflow'],
      lastModified: '2026-05-30T14:12:39Z',
      lastModifiedBy: 'lucas.ferreira',
      isOccupied: false,
    },
    {
      id: 'app-009',
      title: 'Support Ticketing System',
      description: 'Manages customer support requests, SLAs, and agent assignment workflows.',
      currentBranch: 'hotfix/sla-timer',
      otherBranches: ['main', 'develop'],
      lastModified: '2026-09-03T09:58:04Z',
      lastModifiedBy: 'grace.lindqvist',
      isOccupied: false,
    },
    {
      id: 'app-010',
      title: 'Event Registration Site',
      description: 'Handles ticket sales, attendee check-in, and event scheduling for conferences.',
      currentBranch: 'main',
      otherBranches: [],
      lastModified: '2026-04-17T17:26:51Z',
      lastModifiedBy: 'daniel.weiss',
      isOccupied: false,
    },
    {
      id: 'app-011',
      title: 'Fitness Tracker Backend',
      description: 'Aggregates workout data, syncs with wearables, and computes health metrics.',
      currentBranch: 'feature/apple-health-sync',
      otherBranches: ['main', 'develop', 'feature/social-challenges'],
      lastModified: '2026-08-30T23:11:29Z',
      lastModifiedBy: 'yuki.matsumoto',
      isOccupied: false,
    },
    {
      id: 'app-012',
      title: 'Legal Document Repository',
      description:
        'Secure storage and version control for contracts, NDAs, and compliance documents.',
      currentBranch: 'main',
      otherBranches: ['feature/redaction-tool'],
      lastModified: '2026-07-08T11:03:16Z',
      lastModifiedBy: 'isabel.rossi',
      isOccupied: true,
    },
  ];
}
