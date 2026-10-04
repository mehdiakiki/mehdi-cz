const path = require("node:path");

function applyNextSupportedBrowserPolyfills(config, webpack) {
  const replacement = path.join(__dirname, "next-supported-browser-polyfills.js");
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /[/\\]build[/\\]polyfills[/\\]polyfill-module(?:\.js)?$/,
      replacement
    )
  );
}

module.exports = { applyNextSupportedBrowserPolyfills };
