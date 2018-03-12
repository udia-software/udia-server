const {
  arch,
  cpus,
  endianness,
  loadavg,
  hostname,
  platform,
  freemem,
  totalmem,
  release,
  uptime
} = require("os");
const { version } = require("../package.json");

function metric() {
  return {
    version,
    arch: arch(),
    hostname: hostname(),
    platform: platform(),
    release: release(),
    endianness: endianness(),
    freemem: freemem(),
    totalmem: totalmem(),
    uptime: uptime(),
    timestamp: Date.now(),
    loadavg: loadavg(),
    cpus: cpus(),
  };
}

module.exports = { metric };
