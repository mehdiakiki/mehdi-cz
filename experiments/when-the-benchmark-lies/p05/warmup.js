function mix(x) {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function batch(calls, seed) {
  let sink = seed;
  for (let i = 0; i < calls; i++) {
    sink = (sink + mix(sink + i)) >>> 0;
  }
  return sink;
}

const batches = Number(process.argv[2]);
const calls = Number(process.argv[3]);
let sink = 0;
for (let b = 1; b <= batches; b++) {
  const start = process.hrtime.bigint();
  sink = batch(calls, sink);
  const ns = Number(process.hrtime.bigint() - start);
  console.log(`batch ${b}: ${(ns / calls).toFixed(2)} ns per call`);
}
console.log(`sink ${sink}`);
