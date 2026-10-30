import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

assert.equal(process.env.GITHUB_ACTIONS,"true","Run compiler workloads in GitHub CI");
const work=await mkdtemp("/tmp/mehdi-build-drafts-");
const evidence="/tmp/editorial-evidence/build-drafts";
await mkdir(evidence,{recursive:true});
const environment={...process.env,RUST_BACKTRACE:"1",CARGO_BUILD_JOBS:"2",CARGO_INCREMENTAL:"0",CARGO_PROFILE_RELEASE_OPT_LEVEL:"1",CARGO_PROFILE_RELEASE_DEBUG:"0"};
const records=[];
function run(command,args,cwd,success=true) {
  const start=performance.now();
  const result=spawnSync(command,args,{cwd,env:environment,encoding:"utf8",timeout:60000,maxBuffer:4*1024*1024});
  assert.ifError(result.error);
  if(success)assert.equal(result.status,0,`${command}: ${result.stderr}`);
  else assert.notEqual(result.status,0,`${command} unexpectedly passed`);
  records.push({command,args,cwd:cwd.replace(work,"WORK"),status:result.status,milliseconds:performance.now()-start,stdout:result.stdout,stderr:result.stderr});
  return records.at(-1);
}

const generation=path.join(work,"generation");
await mkdir(path.join(generation,"src"),{recursive:true});
await mkdir(path.join(generation,"schema"));
await writeFile(path.join(generation,"Cargo.toml"),'[package]\nname="generator_fixture"\nversion="0.1.0"\nedition="2021"\n[workspace]\n');
await copyFile("experiments/practical-builds/build.rs",path.join(generation,"build.rs"));
const consumer='include!(concat!(env!("OUT_DIR"), "/client.rs"));\nfn main() { println!("generation={}:{}",api_alpha(),api_beta()); }\n';
await writeFile(path.join(generation,"src/main.rs"),consumer);
await writeFile(path.join(generation,"schema/api.txt"),"alpha\nbeta\n");
await writeFile(path.join(generation,"template.cfg"),"7\n");
run("cargo",["generate-lockfile","--offline"],generation);
const baseline=run("cargo",["run","--locked","--offline","--quiet"],generation);assert.match(baseline.stdout,/generation=7:7/);
await writeFile(path.join(generation,"template.cfg"),"8\n");
assert.match(run("cargo",["run","--locked","--offline","--quiet"],generation).stdout,/generation=8:8/);
await writeFile(path.join(generation,"schema/api.txt"),"alpha\n");
const removed=run("cargo",["build","--locked","--offline"],generation,false);assert.match(removed.stderr,/api_beta/);
await writeFile(path.join(generation,"src/main.rs"),'include!(concat!(env!("OUT_DIR"), "/client.rs"));\nfn main() { println!("generation={}",api_alpha()); }\n');
assert.match(run("cargo",["run","--locked","--offline","--quiet"],generation).stdout,/generation=8/);
await unlink(path.join(generation,"template.cfg"));
assert.match(run("cargo",["build","--locked","--offline"],generation,false).stderr,/required template\.cfg/);
await writeFile(path.join(generation,"template.cfg"),"9\n");
assert.match(run("cargo",["run","--locked","--offline","--quiet"],generation).stdout,/generation=9/);
console.log("GENERATION: empty output=7:7; template change=8:8; removed API refuses stale consumer; missing template fails even with prior output; restored input=9");

function generatedSource(bias) {
  return `pub fn lookup(id: usize) -> usize { (match id { ${Array.from({length:512},(_,id)=>`${id}=>${id},`).join("")} _=>0 })+${bias} }\n`;
}
const samples=[];
for(const split of [false,true]) {
  const directory=path.join(work,split?"split":"inline");await mkdir(path.join(directory,"src"),{recursive:true});
  const app=path.join(directory,"src/main.rs");
  const generated=path.join(directory,split?"generated/src/lib.rs":"src/generated.rs");
  if(split)await mkdir(path.dirname(generated),{recursive:true});
  let manifest='[package]\nname="application_fixture"\nversion="0.1.0"\nedition="2021"\n';
  if(split){manifest+='[workspace]\nmembers=["generated"]\n[dependencies]\ngenerated_client={path="generated"}\n';await writeFile(path.join(directory,"generated/Cargo.toml"),'[package]\nname="generated_client"\nversion="0.1.0"\nedition="2021"\n');}
  else manifest+='[workspace]\n';
  await writeFile(path.join(directory,"Cargo.toml"),manifest);
  const appSource=revision=>(split?'use generated_client as generated;\n':'mod generated;\n')+`fn main(){println!("value={}",generated::lookup(7)+${revision});}\n`;
  await writeFile(generated,generatedSource(1));await writeFile(app,appSource(1));
  run("cargo",["generate-lockfile","--offline"],directory);run("cargo",["build","--release","--offline","--locked"],directory);
  for(const edit of ["application","generated"]) {
    await writeFile(app,appSource(1));await writeFile(generated,generatedSource(1));
    run("cargo",["build","--release","--offline","--locked"],directory);
    for(let sample=1;sample<=3;sample++) {
    const appRevision=edit==="application"?sample+1:1;
    const bias=edit==="generated"?sample+1:1;
    if(edit==="application")await writeFile(app,appSource(appRevision));
    if(edit==="generated")await writeFile(generated,generatedSource(bias));
    const result=run("cargo",["build","--release","--offline","--locked","--verbose"],directory);
    const executable=path.join(directory,"target/release/application_fixture");
    assert.equal(execFileSync(executable,{encoding:"utf8"}).trim(),`value=${7+bias+appRevision}`);
    const row={split,edit,sample,milliseconds:result.milliseconds,generatedFresh:/Fresh generated_client/.test(result.stderr)};samples.push(row);console.log(`CRATE_SAMPLE ${JSON.stringify(row)}`);
    }
  }
}

const source=path.join(work,"symbols.rs");await copyFile("experiments/practical-builds/symbols.rs",source);
const full=path.join(work,"symbols-full");
const flags=["--edition=2021","-g","-C","opt-level=1","-C","relocation-model=static","-C","link-arg=-no-pie","-C","link-arg=-Wl,--build-id=sha1"];
run("rustc",[...flags,source,"-o",full],work);
const debug=path.join(evidence,"symbols.debug");const stripped=path.join(evidence,"symbols-stripped");
run("objcopy",["--only-keep-debug",full,debug],work);
run("strip",["--strip-all","-o",stripped,full],work);
run("objcopy",[`--add-gnu-debuglink=${debug}`,stripped],work);
const buildId=file=>execFileSync("readelf",["-n",file],{encoding:"utf8"}).match(/Build ID: ([a-f0-9]+)/)?.[1];
const binaryId=buildId(stripped);assert.ok(binaryId);assert.equal(buildId(debug),binaryId);
const crash=run(stripped,[],work,false);assert.match(crash.stderr,/controlled symbol fixture A/);
const address=crash.stdout.match(/marker=(0x[a-f0-9]+)/)?.[1];assert.ok(address);
function resolveMatching(binary, symbols, address) {
  assert.equal(buildId(binary),buildId(symbols),"symbol build ID mismatch");
  return execFileSync("addr2line",["-f","-C","-e",symbols,address],{encoding:"utf8"});
}
const location=resolveMatching(stripped,debug,address);assert.match(location,/retained_marker/);assert.match(location,/symbols\.rs:\d+/);
await writeFile(source,(await readFile(source,"utf8")).replace("fixture A","fixture B"));
const other=path.join(work,"different-binary");run("rustc",[...flags,source,"-o",other],work);assert.notEqual(buildId(other),binaryId);assert.throws(()=>resolveMatching(other,debug,address),/symbol build ID mismatch/);
const identity={binary_sha256:createHash("sha256").update(await readFile(stripped)).digest("hex"),build_id:binaryId,debug_build_id:buildId(debug),mismatched_build_id:buildId(other),marker_address:address,location,toolchain:execFileSync("rustc",["-vV"],{encoding:"utf8"}),flags,scope:"Linux x86_64 non-PIE fixture; not a universal release build recipe"};
await copyFile("experiments/practical-builds/symbols.rs",path.join(evidence,"symbols.rs"));
await writeFile(path.join(evidence,"identity.json"),JSON.stringify(identity,null,2)+"\n");
await writeFile(path.join(evidence,"samples.json"),JSON.stringify(samples,null,2)+"\n");
await writeFile(path.join(evidence,"commands.json"),JSON.stringify(records,null,2)+"\n");
console.log(`SYMBOLS: matching build IDs resolve ${location.trim().replaceAll("\n"," ")}; different build ID refused; binary SHA-256 recorded`);
