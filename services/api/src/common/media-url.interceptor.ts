import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { rewriteMediaInJson } from './media-url';

/** Rewrites upload/localhost image URLs on every JSON API response. */
@Injectable()
export class MediaUrlInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => rewriteMediaInJson(data)));
  }
}
