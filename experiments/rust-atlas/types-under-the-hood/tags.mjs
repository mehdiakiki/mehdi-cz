// Article 9: what a dynamic language checks at runtime.
// Every value summed below is a number, so no string work is measured.
// Each variant gets its OWN copy of the summing function, built with the
// Function constructor, because V8 remembers per call site: once a site has
// seen many shapes it stays slow, and reusing one function would leak the
// first measurement into the second.
function freshSumField() {
  return new Function("objects", `
    let s = 0;
    for (let i = 0; i < objects.length; i++) s += objects[i].x;
    return s;
  `);
}
function freshSumArray() {
  return new Function("xs", `
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[i];
    return s;
  `);
}
// The median of many passes, because a single mean moves a lot between runs.
function bench(f, arg, runs) {
  for (let i = 0; i < 5; i++) f(arg);
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    f(arg);
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

const N = 2_000_000;
// Shapes that all put x first, in an object of the same size, so the only
// thing that changes between them is the shape identity.
const makers = [
  () => ({ x: 1, p: 2 }),
  () => ({ x: 1, q: 2 }),
  () => ({ x: 1, r: 2 }),
  () => ({ x: 1, s: 2 }),
  () => ({ x: 1, t: 2 }),
  () => ({ x: 1, u: 2 }),
];
console.log("summing objects[i].x over 2000000 objects, by number of shapes:");
for (const count of [1, 2, 3, 4, 5, 6]) {
  const data = Array.from({ length: N }, (_, i) => makers[i % count]());
  const ms = bench(freshSumField(), data, 41);
  console.log(`  ${count} shape${count === 1 ? " " : "s"}: ${ms.toFixed(1)} ms per pass`);
}

console.log("summing 2000000 numbers, by what the array holds:");
for (const [label, make] of [
  ["small integers", () => 1],
  ["doubles       ", () => 1.5],
  ["both          ", (i) => (i % 2 ? 1 : 1.5)],
]) {
  const data = Array.from({ length: N }, (_, i) => make(i));
  console.log(`  ${label}: ${bench(freshSumArray(), data, 41).toFixed(1)} ms per pass`);
}
console.log(`typeof 1 = ${typeof 1}, typeof "1" = ${typeof "1"}: the tag is readable at runtime`);
