function first<T>(xs: T[]): T {
  return xs[0];
}

interface Speak {
  speak(): number;
}

class Dog implements Speak { speak(): number { return 1; } }
class Cat implements Speak { speak(): number { return 2; } }

function speak(s: Speak): number {
  return s.speak();
}

console.log(first<number>([7, 8, 9]), first<string>(["a", "b"]));
console.log(speak(new Dog()), speak(new Cat()));
