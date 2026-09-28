import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class BlobToJsonInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      switchMap(event => {
        if (event instanceof HttpResponse && event.body instanceof Blob) {
          // It might be a JSON Blob. Attempt to parse it.
          return from(event.body.text().then(text => {
            try {
              const parsed = text ? JSON.parse(text) : null;
              return event.clone({ body: parsed });
            } catch (e) {
              return event; // Not JSON, return original
            }
          }));
        }
        return from([event]);
      })
    );
  }
}
