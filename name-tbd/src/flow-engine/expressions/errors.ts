/** An expression that can't be read or evaluated, with where in it (or in its template) the problem is. */
export class ExpressionError extends Error {
  constructor(message: string, readonly start: number, readonly end: number) {
    super(message);
    this.name = 'ExpressionError';
  }
}
