import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve(process.cwd(), "src/content/blog");

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  const frontmatter = {};
  const lines = frontmatterText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Handle boolean values
    if (value === "true" || value === "false") {
      frontmatter[key] = value === "true";
      continue;
    }

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Extract slug from filename
 */
function getSlugFromFilename(filename) {
  return path.basename(filename, ".md");
}

/**
 * Extract H1 from HTML content
 */
function extractH1(content) {
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    return h1Match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  return null;
}

/**
 * Extract first meaningful paragraph for description
 */
function extractDescription(content, maxLength = 155) {
  // Remove HTML tags and decode entities
  let text = content
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Find first sentence or meaningful chunk
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 0) {
    let desc = sentences[0].trim();
    if (desc.length > maxLength) {
      desc = desc.slice(0, maxLength).trim();
      // Try to end at a word boundary
      const lastSpace = desc.lastIndexOf(" ");
      if (lastSpace > maxLength * 0.7) {
        desc = desc.slice(0, lastSpace);
      }
    }
    return desc || null;
  }

  // Fallback: first chunk of text
  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim();
    const lastSpace = text.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.7) {
      text = text.slice(0, lastSpace);
    }
  }
  return text || null;
}

/**
 * Clean frontmatter - remove Webflow-specific junk
 */
function cleanFrontmatter(fm) {
  const cleaned = { ...fm };

  // Remove Webflow-specific fields (keep common ones)
  const webflowFields = [
    "Collection ID",
    "Item ID",
    "Created On",
    "Updated On",
    "Blog Post - Thumbnail V1",
    "Blog Post - Featured Image",
    "Blog Post - Summary",
    "Blog Post - Is Popular?",
    "Blog Post - Author",
    "Meta Tag",
    "Title Tag",
    "blog-post-read-time",
  ];

  for (const field of webflowFields) {
    delete cleaned[field];
  }

  return cleaned;
}

/**
 * Format YAML value (add quotes if needed)
 */
function formatYamlValue(value) {
  const str = String(value);
  if (
    str.includes(":") ||
    str.includes("\n") ||
    str.includes('"') ||
    str.includes("'") ||
    str.includes("[") ||
    str.includes("]") ||
    str.trim() !== str
  ) {
    return JSON.stringify(str);
  }
  return str;
}

/**
 * Check if canonical is malformed
 */
function isCanonicalMalformed(canonical, slug) {
  if (!canonical) return true;
  const expected = `https://jobsolv.com/blog/${slug}`;
  return canonical !== expected;
}

/**
 * Build frontmatter string - preserve existing fields, only add required ones
 */
function buildFrontmatter(originalFm, requiredFields) {
  const lines = ["---"];

  // Always include required fields (title, slug, description, canonical)
  lines.push(`title: ${formatYamlValue(requiredFields.title)}`);
  lines.push(`slug: ${formatYamlValue(requiredFields.slug)}`);
  lines.push(`description: ${formatYamlValue(requiredFields.description || "")}`);
  lines.push(`canonical: ${formatYamlValue(requiredFields.canonical)}`);

  // Preserve other valid fields from original frontmatter (not Webflow junk)
  const validFields = ["pubDate", "category", "draft", "archived"];
  for (const key of validFields) {
    if (originalFm[key] !== undefined) {
      const value = originalFm[key];
      if (typeof value === "boolean") {
        lines.push(`${key}: ${value}`);
      } else {
        lines.push(`${key}: ${formatYamlValue(value)}`);
      }
    }
  }

  lines.push("---");
  return lines.join("\n");
}

function main() {
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(BLOG_DIR, f));

  let processed = 0;
  let updated = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter: fm, body } = parseFrontmatter(content);
    const filename = path.basename(filePath);
    const slugFromFile = getSlugFromFilename(filename);

    // Clean frontmatter
    const cleaned = cleanFrontmatter(fm);

    // Determine required fields - keep existing if present, add if missing
    const requiredFields = {};

    // Slug: use existing or filename
    requiredFields.slug = cleaned.slug || slugFromFile;

    // Title: keep existing, fallback to H1 or slug
    if (cleaned.title && cleaned.title.trim()) {
      requiredFields.title = cleaned.title.trim();
    } else {
      const h1 = extractH1(body);
      requiredFields.title = h1 || slugFromFile.replace(/-/g, " ");
    }

    // Description: keep existing, fallback to extracted
    if (cleaned.description && cleaned.description.trim()) {
      requiredFields.description = cleaned.description.trim();
    } else {
      const desc = extractDescription(body);
      if (desc) {
        requiredFields.description = desc;
      } else {
        requiredFields.description = "";
      }
    }

    // Canonical: always fix to correct format
    const expectedCanonical = `https://jobsolv.com/blog/${requiredFields.slug}`;
    if (
      isCanonicalMalformed(cleaned.canonical, requiredFields.slug)
    ) {
      requiredFields.canonical = expectedCanonical;
    } else {
      requiredFields.canonical = cleaned.canonical;
    }

    const newContent = `${buildFrontmatter(fm, requiredFields)}\n${body}`;

    // Only write if content changed
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, "utf8");
      updated++;
    }

    processed++;
  }

  console.log(`Processed ${processed} file(s).`);
  console.log(`Updated ${updated} file(s).`);
}

main();
