import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve(process.cwd(), "src/content/blog");

// Role tag to hub URL mapping
const ROLE_HUB_MAP = {
  "data-analyst": "/career-hub/data-analyst",
  "data-scientist": "/career-hub/data-scientist",
  "business-analyst": "/career-hub/business-analyst",
  "software-engineer": "/career-hub/software-engineer",
  "entry-level": "/career-hub/recent-graduate",
  "general": "/career-hub/job-search",
};

// Role tag to display name mapping
const ROLE_DISPLAY_NAMES = {
  "data-analyst": "Data Analyst",
  "data-scientist": "Data Scientist",
  "business-analyst": "Business Analyst",
  "software-engineer": "Software Engineer",
  "entry-level": "Recent Graduate",
  "general": "Job Search",
};

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
      // End of tags section - check if this is a new top-level key
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
      // Skip indented lines that aren't tag items
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
 * Load all blog posts with their metadata
 */
function loadAllPosts() {
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const filePath = path.join(BLOG_DIR, f);
      const content = fs.readFileSync(filePath, "utf8");
      const { frontmatter, body } = parseFrontmatter(content);
      const slug = frontmatter.slug || path.basename(f, ".md");

      return {
        slug,
        title: frontmatter.title || slug,
        tags: frontmatter.tags || { role: [], intent: [] },
        pubDate: frontmatter.pubDate,
        filePath,
        body,
      };
    });

  return files;
}

/**
 * Get primary role tag (first role tag or 'general')
 */
function getPrimaryRole(tags) {
  if (tags.role && tags.role.length > 0) {
    return tags.role[0];
  }
  return "general";
}

/**
 * Find related posts based on shared tags
 */
function findRelatedPosts(currentPost, allPosts, maxLinks = 5) {
  const currentSlug = currentPost.slug;
  const currentRoleTags = currentPost.tags.role || [];
  const currentIntentTags = currentPost.tags.intent || [];

  // Score posts by tag overlap
  const scored = allPosts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => {
      const postRoleTags = post.tags.role || [];
      const postIntentTags = post.tags.intent || [];

      let score = 0;

      // Role tag match (higher weight)
      const roleOverlap = currentRoleTags.filter((tag) =>
        postRoleTags.includes(tag)
      ).length;
      score += roleOverlap * 10;

      // Intent tag match
      const intentOverlap = currentIntentTags.filter((tag) =>
        postIntentTags.includes(tag)
      ).length;
      score += intentOverlap * 5;

      // Prefer newer posts (if pubDate exists)
      if (post.pubDate && currentPost.pubDate) {
        const postDate = new Date(post.pubDate);
        const currentDate = new Date(currentPost.pubDate);
        if (postDate > currentDate) {
          score += 2;
        }
      }

      return { post, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLinks)
    .map((item) => item.post);

  return scored;
}

/**
 * Check if footer sections already exist
 */
function hasFooterSections(body) {
  return (
    body.includes("## Optimize your resume instantly") ||
    body.includes("## Related career guidance") ||
    body.includes("## Related articles")
  );
}

/**
 * Build footer sections
 */
function buildFooterSections(roleTag, relatedPosts) {
  const sections = [];

  // 1. Tool CTA (always)
  sections.push(
    "---",
    "",
    "## Optimize your resume instantly",
    "",
    "Use Jobsolv's AI-powered Resume Tailor to customize your resume for each role in minutes.",
    "",
    "👉 https://jobsolv.com/resume-tailor",
    ""
  );

  // 2. Career hub link
  const hubSlug = ROLE_HUB_MAP[roleTag] || ROLE_HUB_MAP.general;
  const roleName = ROLE_DISPLAY_NAMES[roleTag] || ROLE_DISPLAY_NAMES.general;
  sections.push(
    "---",
    "",
    `## Related career guidance`,
    "",
    `This article is part of the **${roleName} Career Hub**, where we cover resumes, interviews, and job search strategies.`,
    "",
    `👉 https://jobsolv.com${hubSlug}`,
    ""
  );

  // 3. Related posts
  if (relatedPosts.length > 0) {
    sections.push("---", "", "## Related articles", "");
    for (const post of relatedPosts) {
      const url = `https://jobsolv.com/blog/${post.slug}`;
      sections.push(`- [${post.title}](${url})`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

function main() {
  const allPosts = loadAllPosts();
  let processed = 0;
  let updated = 0;

  for (const post of allPosts) {
    // Skip if footer sections already exist
    if (hasFooterSections(post.body)) {
      processed++;
      continue;
    }

    const roleTag = getPrimaryRole(post.tags);
    const relatedPosts = findRelatedPosts(post, allPosts, 5);

    const footer = buildFooterSections(roleTag, relatedPosts);
    const newBody = `${post.body.trim()}\n\n${footer}`;

    // Read original content to preserve frontmatter exactly
    const originalContent = fs.readFileSync(post.filePath, "utf8");
    const { frontmatter: fm, body: originalBody } = parseFrontmatter(
      originalContent
    );

    // Rebuild content with new body
    const frontmatterMatch = originalContent.match(/^---\n([\s\S]*?)\n---\n/);
    if (frontmatterMatch) {
      const newContent = `${frontmatterMatch[0]}${newBody}`;
      fs.writeFileSync(post.filePath, newContent, "utf8");
      updated++;
    }

    processed++;
  }

  console.log(`Processed ${processed} file(s).`);
  console.log(`Updated ${updated} file(s).`);
}

main();
