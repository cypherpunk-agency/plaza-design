/** Native frame clear shared by game and authoring preview. */
export function clearWorld(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
}
