type Human = "man" | "woman";

function label(h: Human | undefined): string {
  switch (h) {
    case "man": return "sir";
    case undefined: return "nobody";
  }
  const missing: never = h;
  return missing;
}
console.log(label("man"));
