interface Stamp {
  stamp(n: number): number;
}

class Doubler implements Stamp {
  stamp(n: number): number {
    return n * 2;
  }
}

function run(s: Stamp, n: number): number {
  return s.stamp(n);
}

console.log(run(new Doubler(), 21));
