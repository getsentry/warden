/**
 * Return true when a Pi model selector uses provider/model syntax.
 */
export function isPiModelSelector(model: string): boolean {
  const slashIndex = model.indexOf('/');
  return (
    slashIndex > 0 &&
    slashIndex < model.length - 1 &&
    model.indexOf('/', slashIndex + 1) === -1
  );
}
