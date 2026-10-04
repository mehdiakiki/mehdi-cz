type Human = "man" | "woman";

function greet(h: Human): string {
  if (h === "man") {
    return "Hello sir";
  }
  return "Hello madam";
}

console.log(greet("man"));
