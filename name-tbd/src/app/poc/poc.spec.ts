import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Poc } from './poc';

describe('Poc', () => {
  let component: Poc;
  let fixture: ComponentFixture<Poc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Poc],
    }).compileComponents();

    fixture = TestBed.createComponent(Poc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
