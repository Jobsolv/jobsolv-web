import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve(process.cwd(), "src/content/blog");

// Allowed tag values
const ROLE_TAGS = [
  "data-analyst",
  "data-scientist",
  "business-analyst",
  "software-engineer",
  "entry-level",
  "general",
];

const INTENT_TAGS = [
  "resume",
  "interview",
  "job-search",
  "ats",
  "salary",
  "remote-work",
  "career-growth",
  "tools",
];

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
      // End of tags section
      if (trimmed && !trimmed.startsWith(" ") && trimmed.includes(":")) {
        inTags = false;
        currentTagType = null;
        // Process this line as a regular field
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

    // Handle regular fields
    if (!inTags) {
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
  }

  return { frontmatter, body };
}

/**
 * Extract headings from content
 */
function extractHeadings(content) {
  const headings = [];
  const h1Matches = content.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  const h2Matches = content.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  const h3Matches = content.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);

  for (const match of h1Matches) {
    headings.push(match[1].replace(/<[^>]+>/g, "").trim());
  }
  for (const match of h2Matches) {
    headings.push(match[1].replace(/<[^>]+>/g, "").trim());
  }
  for (const match of h3Matches) {
    headings.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  return headings;
}

/**
 * Infer role tags from content
 */
function inferRoleTags(title, headings, body) {
  const text = `${title} ${headings.join(" ")} ${body}`.toLowerCase();
  const roles = new Set();

  // Data analyst keywords
  if (
    text.includes("data analyst") ||
    text.includes("data analytics") ||
    text.includes("analytics role") ||
    text.includes("analyst job") ||
    text.includes("sql analyst") ||
    text.includes("tableau") ||
    text.includes("power bi")
  ) {
    roles.add("data-analyst");
  }

  // Data scientist keywords
  if (
    text.includes("data scientist") ||
    text.includes("data science") ||
    text.includes("machine learning") ||
    text.includes("ml engineer") ||
    text.includes("statistical model") ||
    text.includes("python model")
  ) {
    roles.add("data-scientist");
  }

  // Business analyst keywords
  if (
    text.includes("business analyst") ||
    text.includes("business analytics") ||
    text.includes("ba role") ||
    text.includes("stakeholder")
  ) {
    roles.add("business-analyst");
  }

  // Software engineer keywords
  if (
    text.includes("software engineer") ||
    text.includes("software developer") ||
    text.includes("developer job") ||
    text.includes("coding") ||
    text.includes("programming")
  ) {
    roles.add("software-engineer");
  }

  // Entry-level keywords
  if (
    text.includes("entry level") ||
    text.includes("entry-level") ||
    text.includes("first job") ||
    text.includes("recent graduate") ||
    text.includes("junior") ||
    text.includes("starting your career")
  ) {
    roles.add("entry-level");
  }

  // If no role detected, use general
  if (roles.size === 0) {
    roles.add("general");
  }

  // Limit to 2 roles max, prioritize specific over general
  const roleArray = Array.from(roles);
  if (roleArray.includes("general") && roleArray.length > 1) {
    roleArray.splice(roleArray.indexOf("general"), 1);
  }

  return roleArray.slice(0, 2);
}

/**
 * Infer intent tags from content
 */
function inferIntentTags(title, headings, body) {
  const text = `${title} ${headings.join(" ")} ${body}`.toLowerCase();
  const intents = new Set();

  // Resume keywords
  if (
    text.includes("resume") ||
    text.includes("cv") ||
    text.includes("resume builder") ||
    text.includes("resume tips") ||
    text.includes("resume format")
  ) {
    intents.add("resume");
  }

  // Interview keywords
  if (
    text.includes("interview") ||
    text.includes("interview questions") ||
    text.includes("interview tips") ||
    text.includes("interview prep") ||
    text.includes("interview process")
  ) {
    intents.add("interview");
  }

  // Job search keywords
  if (
    text.includes("job search") ||
    text.includes("finding a job") ||
    text.includes("landing a job") ||
    text.includes("job hunt") ||
    text.includes("job application")
  ) {
    intents.add("job-search");
  }

  // ATS keywords
  if (
    text.includes("ats") ||
    text.includes("applicant tracking") ||
    text.includes("resume scanner") ||
    text.includes("resume optimization")
  ) {
    intents.add("ats");
  }

  // Salary keywords
  if (
    text.includes("salary") ||
    text.includes("pay") ||
    text.includes("compensation") ||
    text.includes("earnings") ||
    text.includes("wage")
  ) {
    intents.add("salary");
  }

  // Remote work keywords
  if (
    text.includes("remote") ||
    text.includes("work from home") ||
    text.includes("wfh") ||
    text.includes("remote job")
  ) {
    intents.add("remote-work");
  }

  // Career growth keywords
  if (
    text.includes("career growth") ||
    text.includes("career advancement") ||
    text.includes("promotion") ||
    text.includes("career path") ||
    text.includes("professional development")
  ) {
    intents.add("career-growth");
  }

  // Tools keywords
  if (
    text.includes("tools") ||
    text.includes("software") ||
    text.includes("platform") ||
    text.includes("technology") ||
    text.includes("stack")
  ) {
    intents.add("tools");
  }

  // Ensure at least 2 intent tags
  const intentArray = Array.from(intents);
  if (intentArray.length < 2) {
    // Add job-search as fallback if missing
    if (!intentArray.includes("job-search")) {
      intentArray.push("job-search");
    }
    // Add career-growth as second fallback if still missing
    if (intentArray.length < 2 && !intentArray.includes("career-growth")) {
      intentArray.push("career-growth");
    }
  }

  return intentArray.slice(0, 4);
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
 * Build frontmatter string with tags
 */
function buildFrontmatter(originalFm, roleTags, intentTags) {
  const lines = ["---"];

  // Preserve existing fields (except tags)
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
    if (originalFm[key] !== undefined) {
      const value = originalFm[key];
      if (typeof value === "boolean") {
        lines.push(`${key}: ${value}`);
      } else if (key === "pubDate" && typeof value === "string") {
        lines.push(`${key}: ${value}`);
      } else {
        lines.push(`${key}: ${formatYamlValue(value)}`);
      }
    }
  }

  // Add tags structure
  lines.push("tags:");
  lines.push("  role:");
  for (const tag of roleTags) {
    lines.push(`    - ${tag}`);
  }
  lines.push("  intent:");
  for (const tag of intentTags) {
    lines.push(`    - ${tag}`);
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

    // Skip if tags already exist
    if (fm.tags) {
      processed++;
      continue;
    }

    const title = String(fm.title || "").trim();
    const headings = extractHeadings(body);
    const roleTags = inferRoleTags(title, headings, body);
    const intentTags = inferIntentTags(title, headings, body);

    // Ensure we have at least 1 role and 2 intent tags
    if (roleTags.length === 0) {
      roleTags.push("general");
    }
    if (intentTags.length < 2) {
      if (!intentTags.includes("job-search")) {
        intentTags.push("job-search");
      }
      if (intentTags.length < 2 && !intentTags.includes("career-growth")) {
        intentTags.push("career-growth");
      }
    }

    const newFrontmatter = buildFrontmatter(fm, roleTags, intentTags);
    const newContent = `${newFrontmatter}\n${body}`;

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
