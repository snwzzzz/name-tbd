import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationCard } from './application-card';

describe('ApplicationCard', () => {
  let component: ApplicationCard;
  let fixture: ComponentFixture<ApplicationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('application', {
      id: '1',
      title: 'Test',
      description: 'Test',
      currentBranch: 'main',
      otherBranches: [],
      lastModified: '2023-01-01',
      lastModifiedBy: 'user',
      isOccupied: false
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
