import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Canvas } from './canvas';
import { provideEditorRuntime } from '../../editor/runtime-adapters/editor-runtime.providers';

describe('Canvas', () => {
  let component: Canvas;
  let fixture: ComponentFixture<Canvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Canvas],
      providers: [provideEditorRuntime()],
    }).compileComponents();

    fixture = TestBed.createComponent(Canvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
