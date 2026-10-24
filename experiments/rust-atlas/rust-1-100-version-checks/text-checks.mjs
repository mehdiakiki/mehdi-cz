// Each check asks the same question: is this compiler at least Rust 1.80?
for (const version of ["1.99.1", "1.100.0"]) {
  console.log(`== ${version}`);
  console.log("string >= '1.80.0'  ", version >= "1.80.0");
  console.log("parseFloat >= 1.8   ", parseFloat(version), parseFloat(version) >= 1.8);
  const [major, minor] = version.split(".").map(Number);
  console.log("split + Number      ", major > 1 || (major === 1 && minor >= 80));
  console.log("localeCompare numeric", version.localeCompare("1.80.0", undefined, { numeric: true }) >= 0);
}
