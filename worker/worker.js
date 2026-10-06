// Cloudflare Worker: receives the form (JSON in a `data` field + image files),
// validates it against the test-record schema, and opens a PR on GitHub with
//   public/tests/test<N>.json
//   public/tests/manifest.json            (manifest, created if missing, updated otherwise)
//   public/tests/pics/test<N>/<n>-<filename>
//
// Setup:
//   1. Fine-grained GitHub token, resource owner iitmotorsports, ONLY this repo,
//      permissions: Contents (read/write), Pull requests (read/write)
//   2. wrangler secret put GITHUB_TOKEN
//   3. wrangler deploy

const CONFIG = {
  owner: "iitmotorsports",
  repo: "Composite-Testing-Log",
  baseBranch: "main",
  // Sites allowed to call this worker. Remove the localhost line when you're done testing.
  allowedOrigins: [
    "https://iitmotorsports.github.io",
  ],
  maxImageBytes: 5 * 1024 * 1024,
  maxImages: 10,
  allowedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  manifestPath: "public/tests/manifest.json",
};

const corsFor = (origin) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
});

const makeJson = (origin) => (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsFor(origin) },
  });

// Branches made by this form all start with this, so other PRs are never mistaken for test submissions
const BRANCH_PREFIX = "testlog/";

class ValidationError extends Error {}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// UTF-8 safe text <-> base64 helpers
const textToBase64 = (text) => btoa(unescape(encodeURIComponent(text)));
const base64ToText = (b64) => decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));

const safeName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(-80);

const testNumOf = (filename) => {
  const m = filename.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
};

// ---- PR comment --------------------------------------------------------
// Escape characters that would break a markdown table cell
const cell = (v) =>
  String(v).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function buildCommentTable(record) {
  const propsCell = Object.keys(record.props).length
    ? Object.entries(record.props)
        .map(([k, v]) => `${cell(k)}: ${cell(v)}`)
        .join("<br>")
    : "—";

  const layupCell = record.layup
    .map((l, i) => `${i + 1}. ${cell(l)}`)
    .join("<br>");

  const rows = [
    ["Test #", record.test_num],
    ["Date", record.date],
    ["Material", cell(record.material)],
    ["Test type", cell(record.test_type)],
    ["Props", propsCell],
    ["Resin type", cell(record.resin_type)],
    ["Resin matrix", cell(record.resin_matrix)],
    ["Manufacturing method", cell(record.mfg_method)],
    ["Layup", layupCell],
    ["Pictures", record.pictures.length], // count only, not the file paths
    ["Core type", record.coretype ? cell(record.coretype) : "—"],
  ];

  return [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([field, value]) => `| ${field} | ${value} |`),
  ].join("\n");
}

// ---- Schema validation -------------------------------------------------
// Enum fields accept any non-empty string, because the form lets users add
// new test types / resin matrices / core types.
function buildRecord(raw, pictures) {
  const str = (v, name, max = 100) => {
    if (typeof v !== "string" || !v.trim() || v.length > max) {
      throw new ValidationError(`Invalid ${name}`);
    }
    return v.trim();
  };

  const testNum = Number(raw.test_num);
  if (!Number.isInteger(testNum) || testNum < 0) {
    throw new ValidationError("test_num must be a whole number");
  }

  if (typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
    throw new ValidationError("Invalid date");
  }

  // props: object of string -> number | string
  const props = {};
  if (raw.props && typeof raw.props === "object" && !Array.isArray(raw.props)) {
    const entries = Object.entries(raw.props);
    if (entries.length > 40) throw new ValidationError("Too many props");
    for (const [k, v] of entries) {
      const key = str(k, "prop name", 60);
      if (typeof v === "number" && Number.isFinite(v)) props[key] = v;
      else props[key] = str(String(v), `prop "${key}"`, 100);
    }
  }

  // layup: ordered list of strings
  if (!Array.isArray(raw.layup) || raw.layup.length === 0 || raw.layup.length > 60) {
    throw new ValidationError("layup must be a non-empty list");
  }
  const layup = raw.layup.map((l) => str(l, "layup entry"));

  // coretype is optional
  const coretype =
    raw.coretype == null || raw.coretype === "" ? null : str(raw.coretype, "coretype", 60);

  return {
    test_num: testNum,
    date: raw.date,
    material: str(raw.material, "material"),
    test_type: str(raw.test_type, "test_type", 60),
    props,
    resin_type: str(raw.resin_type, "resin_type"),
    resin_matrix: str(raw.resin_matrix, "resin_matrix", 60),
    mfg_method: str(raw.mfg_method, "mfg_method"),
    layup,
    pictures,
    coretype,
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = CONFIG.allowedOrigins.includes(origin);
    // Only echo the origin back if it's on the list
    const corsOrigin = allowed ? origin : CONFIG.allowedOrigins[0];
    const json = makeJson(corsOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsFor(corsOrigin) });
    }
    if (request.method !== "POST" && request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }
    if (!allowed) return json({ error: "Forbidden origin" }, 403);

    const gh = async (path, method = "GET", body) => {
      const res = await fetch(
        `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "form-to-pr-worker",
          },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw Object.assign(new Error(`GitHub ${res.status}: ${data.message}`), {
          status: res.status,
        });
      }
      return data;
    };

    // GET -> next free test number (highest on main or in an open PR, plus one)
    if (request.method === "GET") {
      try {
        const nums = [];
        try {
          const files = await gh(`/contents/public/tests?ref=${CONFIG.baseBranch}`);
          for (const f of files) {
            // manifest.json doesn't match this pattern, so the manifest is ignored here
            const m = f.type === "file" && f.name.match(/^test(\d+)\.json$/);
            if (m) nums.push(Number(m[1]));
          }
        } catch (err) {
          if (err.status !== 404) throw err; // no tests folder yet
        }
        // Also count open PRs created by this form (identified by branch prefix,
        // so code PRs are ignored) so two people don't get the same number
        const prs = await gh("/pulls?state=open&per_page=100");
        for (const pr of prs) {
          const m = pr.head.ref.startsWith(BRANCH_PREFIX) && pr.head.ref.slice(BRANCH_PREFIX.length).match(/^test-(\d+)-/);
          if (m) nums.push(Number(m[1]));
        }
        return json({ next: nums.length ? Math.max(...nums) + 1 : 1 });
      } catch (err) {
        console.error(err);
        return json({ error: "Could not determine next test number" }, 500);
      }
    }

    try {
      const form = await request.formData();

      // Honeypot
      if (form.get("website")) return json({ ok: true });

      let raw;
      try {
        raw = JSON.parse(form.get("data"));
      } catch {
        throw new ValidationError("Malformed form data");
      }

      // Images
      const files = form.getAll("images").filter((f) => f instanceof File && f.size > 0);
      if (files.length > CONFIG.maxImages) throw new ValidationError("Too many images");
      for (const f of files) {
        if (!CONFIG.allowedTypes.includes(f.type)) {
          throw new ValidationError(`Unsupported file type: ${f.type}`);
        }
        if (f.size > CONFIG.maxImageBytes) {
          throw new ValidationError(`${f.name} is too large (max 5 MB)`);
        }
      }

      const id = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
      // Validate first, using site-relative picture paths
      const pictureEntries = files.map((f, i) => ({
        file: f,
        sitePath: `tests/pics/test${Number(raw.test_num)}/${i + 1}-${safeName(f.name)}`,
      }));
      const record = buildRecord(raw, pictureEntries.map((p) => p.sitePath));

      const jsonPath = `public/tests/test${record.test_num}.json`;
      const entryName = `test${record.test_num}.json`;
      const branch = `${BRANCH_PREFIX}test-${record.test_num}-${id}`;

      // Refuse duplicates: a test with this number already exists on main
      try {
        await gh(`/contents/${jsonPath}?ref=${CONFIG.baseBranch}`);
        throw new ValidationError(`Test ${record.test_num} already exists`);
      } catch (err) {
        if (err instanceof ValidationError) throw err;
        if (err.status !== 404) throw err; // 404 = free to use
      }

      // 1. Branch from base
      const base = await gh(`/git/ref/heads/${CONFIG.baseBranch}`);
      await gh("/git/refs", "POST", {
        ref: `refs/heads/${branch}`,
        sha: base.object.sha,
      });

      // 2. Commit images (public/ is copied into the built site by Vite)
      for (const { file, sitePath } of pictureEntries) {
        await gh(`/contents/public/${sitePath}`, "PUT", {
          message: `Add image ${file.name} for test ${record.test_num}`,
          content: toBase64(await file.arrayBuffer()),
          branch,
        });
      }

      // 3. Commit the test JSON
      await gh(`/contents/${jsonPath}`, "PUT", {
        message: `Add test ${record.test_num}`,
        content: textToBase64(JSON.stringify(record, null, 2)),
        branch,
      });

      // 4. Update the manifest (create it if it doesn't exist yet)
      let manifest = [];
      let manifestSha; // GitHub requires the existing file's sha to update it
      try {
        const current = await gh(`/contents/${CONFIG.manifestPath}?ref=${branch}`);
        manifestSha = current.sha;
        const parsed = JSON.parse(base64ToText(current.content));
        if (Array.isArray(parsed)) manifest = parsed;
      } catch (err) {
        if (err.status !== 404) throw err; // 404 = first submission, start with an empty list
      }

      manifest = [...new Set([...manifest, entryName])].sort(
        (a, b) => testNumOf(a) - testNumOf(b)
      );

      await gh(`/contents/${CONFIG.manifestPath}`, "PUT", {
        message: `Add test ${record.test_num} to manifest`,
        content: textToBase64(JSON.stringify(manifest, null, 2)),
        branch,
        ...(manifestSha && { sha: manifestSha }),
      });

      // 5. Open PR
      const pr = await gh("/pulls", "POST", {
        title: `Test #${record.test_num}: ${record.test_type} (${record.material})`,
        head: branch,
        base: CONFIG.baseBranch,
        body: `Automated submission. See the comment below for the full record.\n\nFiles: \`${jsonPath}\`, \`${CONFIG.manifestPath}\`.`,
      });

      // 6. Comment a table of all fields. The PR already exists at this point,
      // so a failed comment shouldn't make the whole submission look failed.
      try {
        await gh(`/issues/${pr.number}/comments`, "POST", {
          body: buildCommentTable(record),
        });
      } catch (err) {
        console.error("Could not post PR comment:", err);
      }

      return json({ ok: true, pr: pr.html_url });
    } catch (err) {
      if (err instanceof ValidationError) return json({ error: err.message }, 400);
      console.error(err);
      return json({ error: "Submission failed" }, 500);
    }
  },
};
