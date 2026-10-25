const tls = require("tls");
const fs = require("fs");

const [host, port, ca, servername, crlfile] = process.argv.slice(2);
const options = {
  host,
  port: Number(port),
  ca: fs.readFileSync(ca),
  servername,
  rejectUnauthorized: true,
};
if (crlfile) {
  options.crl = fs.readFileSync(crlfile);
}

const socket = tls.connect(options, () => {
  console.log("node accept", socket.authorized);
  socket.end();
});
socket.setTimeout(10000, () => {
  console.log("node timeout");
  socket.destroy();
});
socket.on("error", (err) => {
  console.log("node reject", err.code || err.message);
});
