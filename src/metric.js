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
const { uptime: p_uptime, version: node_version } = require("process");
const { version } = require("../package.json");

function metric() {
  const freemem_bytes = freemem();
  const totalmem_bytes = totalmem();
  return {
    version,
    node_version,
    arch: arch(),
    hostname: hostname(),
    platform: platform(),
    release: release(),
    endianness: endianness(),
    freemem_GiB: freemem_bytes / 1024 / 1024 / 1024,
    totalmem_GiB: totalmem_bytes / 1024 / 1024 / 1024,
    freemem_GB: freemem_bytes / 1000 / 1000 / 1000,
    totalmem_GB: totalmem_bytes / 1000 / 1000 / 1000,
    os_uptime: Math.floor(os_uptime()),
    p_uptime: Math.floor(p_uptime()),
    now: new Date(),
    loadavg: loadavg(),
    cpus: cpus()
  };
}

module.exports = { metric };
