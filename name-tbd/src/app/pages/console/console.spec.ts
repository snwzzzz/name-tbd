import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationConsole } from './console';

describe('ApplicationConsole', () => {
  let component: ApplicationConsole;
  let fixture: ComponentFixture<ApplicationConsole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationConsole]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationConsole);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
