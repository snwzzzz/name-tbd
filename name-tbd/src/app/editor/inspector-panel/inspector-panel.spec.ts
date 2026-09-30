import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorPanel } from './inspector-panel';

describe('InspectorPanel', () => {
  let component: InspectorPanel;
  let fixture: ComponentFixture<InspectorPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
