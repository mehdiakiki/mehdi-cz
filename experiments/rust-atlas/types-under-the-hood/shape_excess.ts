type Vector = { x: number; y: number };
function vectorNorm(v: Vector): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
console.log(vectorNorm({ x: 3, y: 4, color: "red" }));
