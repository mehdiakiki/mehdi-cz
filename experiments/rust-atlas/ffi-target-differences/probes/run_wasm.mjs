// Instantiates the wasm32-unknown-unknown probe with no imports and prints
// the text each exported probe wrote into linear memory.
import { readFileSync } from "node:fs";

const bytes = readFileSync(process.argv[2]);
const module = await WebAssembly.compile(bytes);
console.log(`imports requested by the module: ${WebAssembly.Module.imports(module).length}`);

const instance = await WebAssembly.instantiate(module, {});
const probe = instance.exports;
const text = (len) =>
  new TextDecoder().decode(new Uint8Array(probe.memory.buffer, probe.out_ptr(), len));

probe.install_panic_hook();
for (const [label, name] of [
  ["std::fs::read", "probe_fs"],
  ["std::thread::Builder::spawn", "probe_thread"],
  ["SystemTime::now", "probe_time"],
]) {
  try {
    console.log(`${label} -> ${text(probe[name]())}`);
  } catch (error) {
    console.log(`${label} -> ${error.constructor.name}: ${error.message}`);
    console.log(`  panic hook saw -> ${text(probe.last_panic())}`);
  }
}
