import http from "node:http";
import zlib from "node:zlib";

const origin = new URL(process.argv[2] || "http://localhost:3117");
const paths = ["/compression/page", "/compression/route", "/plain/home"];

function request(pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get(
      new URL(pathname, origin),
      { headers: { "accept-encoding": "gzip" } },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          const encoding = response.headers["content-encoding"] || "identity";
          const decoded = encoding === "gzip" ? zlib.gunzipSync(body) : body;
          resolve({
            pathname,
            status: response.statusCode,
            contentType: response.headers["content-type"],
            contentEncoding: encoding,
            vary: response.headers.vary,
            encodedBytes: body.length,
            decodedBytes: decoded.length,
          });
        });
      }
    );
    request.on("error", reject);
  });
}

console.log(JSON.stringify(await Promise.all(paths.map(request)), null, 2));

