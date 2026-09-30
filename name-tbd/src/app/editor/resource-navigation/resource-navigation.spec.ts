import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceNavigation } from './resource-navigation';

describe('ResourceNavigation', () => {
  let component: ResourceNavigation;
  let fixture: ComponentFixture<ResourceNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceNavigation],
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceNavigation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
