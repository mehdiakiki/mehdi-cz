type Point = { x: number; y: number };
type Vector = { x: number; y: number };

function vectorNorm(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

const p: Point = { x: 3, y: 4 };
console.log(vectorNorm(p));

const withColor = { x: 3, y: 4, color: "red" };
console.log(vectorNorm(withColor));
