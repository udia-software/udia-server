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
  uptime: os_uptime
} = require("os");
const { uptime: p_uptime } = require("process");
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
    os_uptime: Math.floor(os_uptime()),
    p_uptime: Math.floor(p_uptime()),
    timestamp: Date.now(),
    loadavg: loadavg(),
    cpus: cpus()
  };
}

module.exports = { metric };
