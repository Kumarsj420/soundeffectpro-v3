// PM2 process config for the Next.js standalone server.
// Runs whatever release /var/www/current points at (see deploy.sh).
const fs = require("fs");

// Load .env.production into the process env (standalone server.js doesn't read it itself)
const envFile = "/var/www/sfx2/.env.production";
const env = {};
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
}

module.exports = {
    apps: [{
        name: "sfx2",
        cwd: "/var/www/current",
        script: "server.js",
        env: { ...env, NODE_ENV: "production", PORT: "3000", HOSTNAME: "127.0.0.1" },
        max_memory_restart: "1G",
        autorestart: true,
    }],
};
