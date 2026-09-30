import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModeDropdown } from './mode-dropdown';

describe('ModeDropdown', () => {
  let component: ModeDropdown;
  let fixture: ComponentFixture<ModeDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModeDropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(ModeDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
