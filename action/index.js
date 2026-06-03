const https = require("https");

const API = "huggingface.co";

// Minimal @actions/core replacements
const getInput = (name) => process.env[`INPUT_${name.toUpperCase()}`] || "";
const setOutput = (k, v) => {
  const f = process.env.GITHUB_OUTPUT;
  if (f) require("fs").appendFileSync(f, `${k}=${v}\n`);
};
const info = (msg) => console.log(msg);
const setFailed = (msg) => {
  console.error(`::error::${msg}`);
  process.exitCode = 1;
};

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: API,
      path,
      method,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (body) opts.headers["Content-Type"] = "application/json";
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400)
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        resolve(JSON.parse(data));
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function streamLogs(namespace, jobId, token) {
  return new Promise((resolve) => {
    const req = https.get(
      {
        hostname: API,
        path: `/api/jobs/${namespace}/${jobId}/logs`,
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        res.setEncoding("utf8");
        let buf = "";
        res.on("data", (chunk) => {
          buf += chunk;
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (line.startsWith("data: {")) {
              try {
                const msg = JSON.parse(line.slice(6)).data;
                if (msg && !msg.startsWith("===== Job started")) {
                  console.log(msg);
                }
              } catch {}
            }
          }
        });
        res.on("end", resolve);
        res.on("error", resolve);
      }
    );
    req.on("error", resolve);
    req.setTimeout(300_000, () => {
      req.destroy();
      resolve();
    });
  });
}

async function waitForCompletion(namespace, jobId, token, timeoutSec) {
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    const job = await request("GET", `/api/jobs/${namespace}/${jobId}`, token);
    const stage = job.status.stage;
    if (stage === "COMPLETED") return;
    if (["ERROR", "CANCELED", "DELETED"].includes(stage)) {
      throw new Error(`Job failed with status: ${stage}`);
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("Timed out waiting for job to finish");
}

// Container setup that runs before the user's script.
// Enables nix sandbox, accepts flake config, sets git identity,
// and works from /tmp.
function buildCommand(userScript) {
  const setup = [
    "set -eux",
    "grep -v -E 'sandbox|filter-syscalls' /etc/nix/nix.conf > /tmp/nix.conf",
    "echo 'sandbox = true' >> /tmp/nix.conf",
    "echo 'filter-syscalls = true' >> /tmp/nix.conf",
    "echo 'accept-flake-config = true' >> /tmp/nix.conf",
    "mv /tmp/nix.conf /etc/nix/nix.conf",
    "git config --global user.email '${GIT_EMAIL:-ci@huggingface.co}'",
    "git config --global user.name '${GIT_NAME:-CI}'",
    "cd /tmp",
  ];
  return ["sh", "-c", setup.join("\n") + "\n" + userScript];
}

async function run() {
  const token = getInput("token");
  const namespace = getInput("namespace");
  const image = getInput("image");
  const script = getInput("script");
  const flavor = getInput("flavor") || "cpu-upgrade";
  const timeout = parseInt(getInput("timeout") || "1200");

  const payload = {
    dockerImage: image,
    command: buildCommand(script),
    arguments: [],
    environment: {},
    flavor,
  };

  const job = await request("POST", `/api/jobs/${namespace}`, token, payload);
  const jobId = job.id;
  const jobUrl = `https://huggingface.co/jobs/${namespace}/${jobId}`;
  info(`Job started: ${jobUrl}`);
  setOutput("job_id", jobId);
  setOutput("job_url", jobUrl);

  await streamLogs(namespace, jobId, token);
  await waitForCompletion(namespace, jobId, token, timeout);
  info("Job succeeded");
}

run().catch((err) => setFailed(err.message));
