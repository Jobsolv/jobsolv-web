import fs from "node:fs";
import path from "node:path";

const INPUT_CSV = path.resolve(process.cwd(), "migrate/webflow-blog.csv");
const OUTPUT_DIR = path.resolve(process.cwd(), "src/content/blog");

/**
 * Minimal CSV parser (RFC4180-ish) supporting quoted fields with newlines.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (c === "\r") continue;

    field += c;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeSlug(slug) {
  const s = String(slug ?? "").trim().replace(/^\/+|\/+$/g, "");
  return s.replace(/^blog\//, "");
}

function yamlString(value) {
  const str = String(value ?? "");
  if (str.includes(":") || str.includes("\n") || str.includes('"') || str.includes("'")) {
    return JSON.stringify(str);
  }
  return str;
}

function parseDateMaybe(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseBoolean(value) {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function main() {
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`CSV not found: ${INPUT_CSV}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const text = fs.readFileSync(INPUT_CSV, "utf8");
  const rows = parseCsv(text).filter((r) => r.some((c) => String(c).trim()));

  if (rows.length === 0) {
    console.error("No rows found in CSV");
    process.exit(1);
  }

  const headers = rows[0];

  // Find exact column indices using exact header names
  const getIndex = (exactName) => {
    const idx = headers.findIndex((h) => String(h).trim() === exactName);
    if (idx === -1) {
      console.warn(`Warning: Column "${exactName}" not found`);
    }
    return idx;
  };

  const idxSlug = getIndex("Blog Post - Link");
  const idxTitle = getIndex("Blog Post - H1");
  const idxBody = getIndex("Blog Post - Richt Text");
  const idxDraft = getIndex("Draft");
  const idxArchived = getIndex("Archived");
  const idxCategory = getIndex("Blog Post - Category");
  const idxDescription = getIndex("Meta description");
  const idxPubDate = getIndex("Published On");

  let created = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // Get slug (Blog Post - Link)
    const slugRaw = idxSlug >= 0 ? String(row[idxSlug] ?? "").trim() : "";
    const slug = normalizeSlug(slugRaw);

    // Get body (Blog Post - Richt Text)
    const bodyRaw = idxBody >= 0 ? String(row[idxBody] ?? "").trim() : "";
    const bodyLength = bodyRaw.length;

    // Skip if no slug or body too short
    if (!slug) continue;
    if (bodyLength <= 50) continue;

    // Get other fields
    const titleRaw = idxTitle >= 0 ? String(row[idxTitle] ?? "").trim() : "";
    const title = titleRaw || slug;
    const description = idxDescription >= 0 ? String(row[idxDescription] ?? "").trim() : "";
    const category = idxCategory >= 0 ? String(row[idxCategory] ?? "").trim() : "";
    const pubDateRaw = idxPubDate >= 0 ? String(row[idxPubDate] ?? "").trim() : "";
    const pubDate = parseDateMaybe(pubDateRaw);
    const draft = idxDraft >= 0 ? parseBoolean(row[idxDraft]) : false;
    const archived = idxArchived >= 0 ? parseBoolean(row[idxArchived]) : false;

    const canonical = `https://jobsolv.com/blog/${slug}`;

    // Build frontmatter
    const frontmatter = [
      "---",
      `title: ${yamlString(title)}`,
      `slug: ${yamlString(slug)}`,
      description ? `description: ${yamlString(description)}` : null,
      pubDate ? `pubDate: ${pubDate}` : null,
      category ? `category: ${yamlString(category)}` : null,
      `draft: ${draft}`,
      `archived: ${archived}`,
      `canonical: ${yamlString(canonical)}`,
      "---",
      "",
    ]
      .filter((line) => line !== null)
      .join("\n");

    // Write markdown file
    const outPath = path.join(OUTPUT_DIR, `${slug}.md`);
    fs.writeFileSync(outPath, `${frontmatter}${bodyRaw}\n`, "utf8");

    created++;
  }

  console.log(`Created ${created} post(s).`);
}

main();
