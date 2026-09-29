import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WidgetRegistryService, WidgetPropDefinition } from './widget-registry.service';

describe('WidgetRegistryService', () => {
  let service: WidgetRegistryService;
  let httpMock: HttpTestingController;

  const mockDefinitions: Record<string, WidgetPropDefinition[]> = {
    button: [
      { id: 1, widgetType: 'button', propKey: 'label', propType: 'string', defaultValue: 'Click Me' }
    ],
    global: [
      { id: 2, widgetType: 'global', propKey: 'x', propType: 'number', defaultValue: '0' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WidgetRegistryService]
    });
    service = TestBed.inject(WidgetRegistryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load definitions from API', () => {
    service.loadDefinitions();
    
    const req = httpMock.expectOne('/api/widget-props');
    expect(req.request.method).toBe('GET');
    
    req.flush(mockDefinitions);
    
    expect(service.propDefinitions()).toEqual(mockDefinitions);
  });

  it('should return combined props for a widget type', () => {
    service.propDefinitions.set(mockDefinitions);
    
    const buttonProps = service.getPropsForWidget('button');
    
    expect(buttonProps.length).toBe(2);
    expect(buttonProps.find(p => p.propKey === 'label')).toBeTruthy();
    expect(buttonProps.find(p => p.propKey === 'x')).toBeTruthy();
  });
  
  it('should return only global props if widget type is unknown', () => {
    service.propDefinitions.set(mockDefinitions);
    
    const unknownProps = service.getPropsForWidget('unknown');
    
    expect(unknownProps.length).toBe(1);
    expect(unknownProps[0].propKey).toBe('x');
  });
});
