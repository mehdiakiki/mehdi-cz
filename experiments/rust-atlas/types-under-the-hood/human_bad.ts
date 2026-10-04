type Human = "man" | "woman";
function greet(h: Human): string { return h === "man" ? "Hello sir" : "Hello madam"; }
console.log(greet("child"));
