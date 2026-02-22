// ============================================================
// JS Example 3: Prototypal Inheritance
// ============================================================
// JavaScript does NOT have classical inheritance. It has
// prototype chains. `class` is syntactic sugar over this
// fundamental mechanism.
//
// Understanding prototypes is like understanding Rust's vtable
// for trait objects — it is the runtime mechanism that makes
// dynamic dispatch work.
// ============================================================

// Every object has an internal [[Prototype]] link.
// When you access a property, JS walks UP the chain.

var animal = {
    type: "animal",
    speak: function() {
        return this.name + " says " + this.sound;
    }
};

// Object.create sets the prototype chain directly.
var dog = Object.create(animal);
dog.name = "Rex";
dog.sound = "woof";

var cat = Object.create(animal);
cat.name = "Whiskers";
cat.sound = "meow";

console.log("=== Prototype Chain ===");
console.log(dog.speak());     // Rex says woof
console.log(cat.speak());     // Whiskers says meow
console.log(dog.type);        // "animal" — found on the prototype!

console.log("");
console.log("=== Property Lookup Walk ===");
console.log("dog.name:", dog.name, "(own property)");
console.log("dog.type:", dog.type, "(found on prototype)");
console.log("dog.toString:", typeof dog.toString, "(found on Object.prototype)");

console.log("");
console.log("=== Mutation Propagates ===");
animal.breathes = true;
console.log("dog.breathes:", dog.breathes); // true — the prototype changed!
console.log("cat.breathes:", cat.breathes); // true — cat sees it too!

// But own properties shadow prototype properties.
dog.type = "canine";
console.log("dog.type:", dog.type);       // "canine" — own property
console.log("cat.type:", cat.type);       // "animal" — still from prototype

console.log("");
console.log("=== The class Sugar ===");

// ES6 class is EXACTLY this, with nicer syntax:
//
//   class Animal {
//     constructor(name, sound) {
//       this.name = name;
//       this.sound = sound;
//     }
//     speak() { return this.name + " says " + this.sound; }
//   }
//
// Under the hood, `speak` lives on Animal.prototype.
// Every instance has a [[Prototype]] link to it.

function Animal(name, sound) {
    this.name = name;
    this.sound = sound;
}
Animal.prototype.speak = function() {
    return this.name + " says " + this.sound;
};

var bird = new Animal("Tweety", "chirp");
console.log(bird.speak());

// The `new` keyword does THREE things:
//   1. Creates an empty object
//   2. Sets its [[Prototype]] to Animal.prototype
//   3. Calls Animal() with `this` bound to the new object
console.log("");
console.log("bird's prototype === Animal.prototype:",
    Object.getPrototypeOf(bird) === Animal.prototype);
