import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const output='experiments/tailwind-source-boundary/results';
const rows=[];
for(let rep=0;rep<3;rep++)for(const variant of rep%2?['bounded','automatic']:['automatic','bounded']){
  const label=`compiler-${rep}-${variant}`;
  await new Promise((resolve,reject)=>{
    const p=spawn(process.execPath,['experiments/tailwind-source-boundary/scripts/compile.mjs',variant,label],{stdio:['ignore','ignore','pipe']});
    let stderr='';p.stderr.on('data',b=>{stderr+=b});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(stderr||`Compiler exit ${code}`)));
  });
  const result=JSON.parse(await readFile(`${output}/${label}-compile.json`,'utf8'));
  const {dependencies,directories,...metrics}=result;
  rows.push({rep,...metrics,dependencyCount:dependencies.length,directoryCount:directories.length});
  await writeFile(`${output}/compiler-benchmark.json`,JSON.stringify({node:process.version,capturedAt:new Date().toISOString(),method:'Three alternating fresh-process pairs. Existing working-tree artifacts; no OS cache eviction. Elapsed includes Tailwind PostCSS, minification, and local artifact output. CPU and peak RSS are process.resourceUsage; not end-to-end Next build time. Run after browser timing.',rows},null,2)+'\n');
  console.log(rows.at(-1));
}
