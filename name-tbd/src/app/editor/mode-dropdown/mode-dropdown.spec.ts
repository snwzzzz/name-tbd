import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModeDropdown } from './mode-dropdown';
import { provideTestEditorContext } from '../../_testing/editor-context.testing';

describe('ModeDropdown', () => {
  let component: ModeDropdown;
  let fixture: ComponentFixture<ModeDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModeDropdown],
      providers: [provideTestEditorContext()],
    }).compileComponents();

    fixture = TestBed.createComponent(ModeDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
