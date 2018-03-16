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

/**
 * CPU metrics are unreliable inside a containerized environment (Docker)
 * Only things we should rely on are versions and now date
 */
function metric() {
  const freemem_bytes = freemem();
  const totalmem_bytes = totalmem();
  const cpus_seconds = cpus().map(cpu => {
    const { model, speed, times } = cpu;
    const { user, nice, sys, idle, irq } = times;
    return {
      model, // CPU model
      speed, // CPU speed (MHz)
      times: {
        user: Math.floor(user / 1000), // Time CPU spent in user mode (seconds)
        nice: Math.floor(nice / 1000), // Time CPU spent in nice mode (seconds)
        sys: Math.floor(sys / 1000), // Time CPU spent in sys mode (seconds)
        idle: Math.floor(idle / 1000), // Time CPU spent in idle mode (seconds)
        irq: Math.floor(irq / 1000) // Time CPU spent in irq mode (seconds)
      }
    };
  });

  return {
    version, // version of application defined in package.json
    node_version, // version of Node.js running the web application
    arch: arch(), // CPU architecture that compiled Node.js binary
    hostname: hostname(), // operating system hostname
    platform: platform(), // 'linux', 'darwin' supported
    release: release(),
    endianness: endianness(),
    freemem_GiB: freemem_bytes / 1024 / 1024 / 1024, // 1 GiB = 1024^3 bytes
    totalmem_GiB: totalmem_bytes / 1024 / 1024 / 1024, // 1 GiB = 2^30 bytes
    freemem_GB: freemem_bytes / 1000 / 1000 / 1000, // 1 GB = 1000^3 bytes
    totalmem_GB: totalmem_bytes / 1000 / 1000 / 1000, // 1 GB = 10^9 bytes
    os_uptime: Math.floor(os_uptime()), // operating system uptime (seconds)
    p_uptime: Math.floor(p_uptime()), // app process uptime (seconds)
    now: new Date(), // system reported current time
    loadavg: loadavg(), // 1, 5, 15 min CPU load averages
    cpus: cpus_seconds
  };
}

module.exports = { metric };
