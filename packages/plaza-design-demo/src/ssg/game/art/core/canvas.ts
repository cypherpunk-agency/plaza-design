/** Native frame clear shared by game and authoring preview. */
export function clearWorld(ctx: CanvasRenderingContext2D, width: number, height: number,background='#000') {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
}
