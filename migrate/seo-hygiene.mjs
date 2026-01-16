import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve(process.cwd(), "src/content/blog");

// Filler words to trim from titles
const FILLER_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "should",
  "could",
  "may",
  "might",
  "must",
  "can",
]);

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

  let inTags = false;
  let currentTagType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle tags structure
    if (trimmed === "tags:") {
      inTags = true;
      frontmatter.tags = { role: [], intent: [] };
      continue;
    }

    if (inTags) {
      if (trimmed === "role:" || trimmed.startsWith("role:")) {
        currentTagType = "role";
        continue;
      }
      if (trimmed === "intent:" || trimmed.startsWith("intent:")) {
        currentTagType = "intent";
        continue;
      }
      if (trimmed.startsWith("- ")) {
        const tag = trimmed.slice(2).trim();
        if (currentTagType && frontmatter.tags) {
          frontmatter.tags[currentTagType].push(tag);
        }
        continue;
      }
      if (trimmed && !trimmed.startsWith(" ") && trimmed.includes(":")) {
        inTags = false;
        currentTagType = null;
        const colonIndex = trimmed.indexOf(":");
        if (colonIndex > 0) {
          const key = trimmed.slice(0, colonIndex).trim();
          let value = trimmed.slice(colonIndex + 1).trim();
          if (value === "true" || value === "false") {
            frontmatter[key] = value === "true";
          } else {
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }
            frontmatter[key] = value;
          }
        }
        continue;
      }
      if (trimmed && trimmed.startsWith(" ")) {
        continue;
      }
    }

    if (!inTags) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      if (value === "true" || value === "false") {
        frontmatter[key] = value === "true";
        continue;
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Clean title: ensure 30-60 chars, trim filler words only
 */
function cleanTitle(title) {
  if (!title) return title;

  let cleaned = title.trim();

  // If too long, try trimming filler words from start/end
  if (cleaned.length > 60) {
    const words = cleaned.split(/\s+/);
    let startIdx = 0;
    let endIdx = words.length;

    // Trim filler words from start
    while (
      startIdx < words.length &&
      FILLER_WORDS.has(words[startIdx].toLowerCase())
    ) {
      startIdx++;
    }

    // Trim filler words from end
    while (
      endIdx > startIdx &&
      FILLER_WORDS.has(words[endIdx - 1].toLowerCase())
    ) {
      endIdx--;
    }

    cleaned = words.slice(startIdx, endIdx).join(" ");

    // If still too long, truncate at word boundary
    if (cleaned.length > 60) {
      const truncated = cleaned.slice(0, 60);
      const lastSpace = truncated.lastIndexOf(" ");
      if (lastSpace > 30) {
        cleaned = truncated.slice(0, lastSpace);
      } else {
        cleaned = truncated;
      }
    }
  }

  // Ensure minimum length
  if (cleaned.length < 30 && title.length >= 30) {
    cleaned = title.slice(0, 60).trim();
    const lastSpace = cleaned.lastIndexOf(" ");
    if (lastSpace > 20) {
      cleaned = cleaned.slice(0, lastSpace);
    }
  }

  return cleaned.trim();
}

/**
 * Extract first paragraph for description fallback
 */
function extractFirstParagraph(body, maxLength = 155) {
  // Remove HTML tags and decode entities
  let text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Find first sentence
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 0) {
    let desc = sentences[0].trim();
    if (desc.length > maxLength) {
      desc = desc.slice(0, maxLength).trim();
      const lastSpace = desc.lastIndexOf(" ");
      if (lastSpace > maxLength * 0.7) {
        desc = desc.slice(0, lastSpace);
      }
    }
    return desc || null;
  }

  // Fallback: first chunk
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
 * Clean description: ensure max 155 chars, unique
 */
function cleanDescription(description, body, existingDescriptions) {
  let cleaned = description ? description.trim() : "";

  // If missing or too long, extract from body
  if (!cleaned || cleaned.length > 155) {
    const extracted = extractFirstParagraph(body);
    if (extracted) {
      cleaned = extracted;
    }
  }

  // Ensure max length
  if (cleaned.length > 155) {
    cleaned = cleaned.slice(0, 155).trim();
    const lastSpace = cleaned.lastIndexOf(" ");
    if (lastSpace > 100) {
      cleaned = cleaned.slice(0, lastSpace);
    }
  }

  // Check for duplicates (simple check - could be improved)
  if (existingDescriptions.has(cleaned.toLowerCase())) {
    // Add variation if duplicate
    const words = cleaned.split(" ");
    if (words.length > 5) {
      cleaned = words.slice(0, -2).join(" ") + ".";
    }
  } else {
    existingDescriptions.add(cleaned.toLowerCase());
  }

  return cleaned;
}

/**
 * Fix heading structure: ensure exactly one H1, proper hierarchy
 */
function fixHeadings(body) {
  let fixed = body;
  const h1Matches = [...fixed.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];

  // If multiple H1s, convert extras to H2
  if (h1Matches.length > 1) {
    let firstH1 = true;
    fixed = fixed.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/gi, (match, attrs, content) => {
      if (firstH1) {
        firstH1 = false;
        return match;
      }
      return `<h2${attrs}>${content}</h2>`;
    });
  }

  // Ensure no skipped levels (H1 -> H3 should become H1 -> H2)
  // This is a simplified check - could be more sophisticated
  fixed = fixed.replace(/<h3([^>]*)>/gi, (match, attrs) => {
    // Check if previous heading was H1 (simplified)
    return match; // Keep as-is for now, can be enhanced
  });

  return fixed;
}

/**
 * Fix images: ensure alt text, add loading="lazy"
 */
function fixImages(body) {
  return body.replace(
    /<img(\s+|\S)([^>]*?)>/gi,
    (match, firstPart, attrs) => {
      // Combine first part and attributes
      const fullAttrs = (firstPart + attrs).trim();
      
      // Check for alt attribute
      const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(fullAttrs);
      const hasLoading = /loading\s*=\s*["']/i.test(fullAttrs);

      // Normalize attributes - ensure space-separated
      let newAttrs = fullAttrs;
      
      // Fix malformed attributes like "src=" to " src=" (if no leading space)
      if (!newAttrs.startsWith(" ")) {
        newAttrs = newAttrs.replace(/^([a-z]+=)/i, ' $1');
      }
      newAttrs = newAttrs.trim();

      // Add alt if missing
      if (!hasAlt) {
        // Try to extract from src filename
        const srcMatch = fullAttrs.match(/src\s*=\s*["']([^"']+)["']/i);
        if (srcMatch) {
          const src = srcMatch[1];
          const filename = src.split("/").pop().split(".")[0];
          const altText = filename
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          newAttrs += ` alt="${altText}"`;
        } else {
          newAttrs += ' alt="Blog post image"';
        }
      }

      // Add lazy loading if not present
      if (!hasLoading) {
        newAttrs += ' loading="lazy"';
      }

      // Ensure proper self-closing format (space before closing /)
      if (!newAttrs.endsWith("/")) {
        newAttrs += " /";
      }
      return `<img ${newAttrs}>`;
    }
  );
}

/**
 * Fix iframes: add loading="lazy" if possible
 */
function fixIframes(body) {
  return body.replace(
    /<iframe\b([^>]*?)>/gi,
    (match, attrs) => {
      const hasLoading = /loading\s*=\s*["']/i.test(attrs);
      if (!hasLoading) {
        return `<iframe${attrs} loading="lazy">`;
      }
      return match;
    }
  );
}

/**
 * Format YAML value
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
 * Build frontmatter string
 */
function buildFrontmatter(fm) {
  const lines = ["---"];

  const preserveFields = [
    "title",
    "slug",
    "description",
    "canonical",
    "pubDate",
    "category",
    "draft",
    "archived",
  ];

  for (const key of preserveFields) {
    if (fm[key] !== undefined) {
      const value = fm[key];
      if (typeof value === "boolean") {
        lines.push(`${key}: ${value}`);
      } else if (key === "pubDate" && typeof value === "string") {
        lines.push(`${key}: ${value}`);
      } else {
        lines.push(`${key}: ${formatYamlValue(value)}`);
      }
    }
  }

  // Add tags if present
  if (fm.tags) {
    lines.push("tags:");
    lines.push("  role:");
    for (const tag of fm.tags.role || []) {
      lines.push(`    - ${tag}`);
    }
    lines.push("  intent:");
    for (const tag of fm.tags.intent || []) {
      lines.push(`    - ${tag}`);
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

  const existingDescriptions = new Set();
  let processed = 0;
  let updated = 0;

  // First pass: collect all descriptions
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    if (frontmatter.description) {
      existingDescriptions.add(frontmatter.description.toLowerCase());
    }
  }

  // Second pass: fix each file
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter: fm, body } = parseFrontmatter(content);

    const slug = fm.slug || path.basename(filePath, ".md");

    // Clean title
    const cleanedTitle = cleanTitle(fm.title || slug);

    // Clean description
    const cleanedDescription = cleanDescription(
      fm.description,
      body,
      existingDescriptions
    );

    // Fix canonical
    const canonical = `https://jobsolv.com/blog/${slug}`;

    // Fix headings
    let fixedBody = fixHeadings(body);

    // Fix images
    fixedBody = fixImages(fixedBody);

    // Fix iframes
    fixedBody = fixIframes(fixedBody);

    // Update frontmatter
    const updatedFm = {
      ...fm,
      title: cleanedTitle,
      description: cleanedDescription,
      canonical,
    };

    const newFrontmatter = buildFrontmatter(updatedFm);
    const newContent = `${newFrontmatter}\n${fixedBody}`;

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
