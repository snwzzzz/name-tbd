import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecourseNavigation } from './recourse-navigation';

describe('RecourseNavigation', () => {
  let component: RecourseNavigation;
  let fixture: ComponentFixture<RecourseNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecourseNavigation],
    }).compileComponents();

    fixture = TestBed.createComponent(RecourseNavigation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
