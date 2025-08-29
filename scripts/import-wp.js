/**
 * scripts/import-wp.js
 *
 * Usage: node scripts/import-wp.js path/to/wordpress-export.xml
 *
 * Produces markdown files under src/posts/YYYY-MM-DD-slug.md
 *
 * Dependencies: xml2js, turndown, slugify, fs-extra
 */
const fs = require("fs-extra");
const xml2js = require("xml2js");
const TurndownService = require("turndown");
const slugify = require("slugify");
const path = require("path");

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced"
});

async function run() {
  const args = process.argv.slice(2);
  const xmlPath = args[0] || "./wordpress-export.xml";
  if (!(await fs.pathExists(xmlPath))) {
    console.error("WordPress export not found at", xmlPath);
    process.exit(1);
  }

  const xml = await fs.readFile(xmlPath, "utf8");
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  const result = await parser.parseStringPromise(xml);

  // WordPress items are in rss.channel.item
  const items = result.rss.channel.item;
  if (!items || items.length === 0) {
    console.error("No items found in export.");
    process.exit(1);
  }

  await fs.ensureDir("src/posts");

  const toArray = v => (Array.isArray(v) ? v : [v]);

  for (const item of toArray(items)) {
    // WP-specific tags are in the wp: namespace; xml2js usually converts ':' to '$ns' or leaves them
    const postType = (item["wp:post_type"] || "").toString();
    const status = (item["wp:status"] || item["wp:post_status"] || "").toString();
    if (postType !== "post" || status !== "publish") continue;

    const title = (item.title || "Untitled").toString();
    const content = (item["content:encoded"] || item["content:encoded"] || "").toString() || "";
    const date = new Date(item["wp:post_date"] || item.pubDate || Date.now());
    const categories = [];
    if (item.category) {
      const cats = Array.isArray(item.category) ? item.category : [item.category];
      for (const cat of cats) {
        if (cat.domain && cat.domain === "category") categories.push(cat._ || cat);
      }
    }

    // slug: try wp:post_name or generate from title
    const rawSlug = (item["wp:post_name"] || item.slug || item["wp:post_name"] || "").toString();
    const slug = rawSlug && rawSlug !== "" ? rawSlug : slugify(title, { lower: true, strict: true });
    const datePrefix = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const filename = `${datePrefix}-${slug}.md`;
    const outPath = path.join("src/posts", filename);

    const md = turndown.turndown(content);

    // Build frontmatter
    const frontmatter = {
      title: title,
      date: date.toISOString(),
      layout: "layouts/post.njk",
      tags: categories
    };

    const fmLines = ["---"];
    fmLines.push(`title: "${frontmatter.title.replace(/"/g, '\\"')}"`);
    fmLines.push(`date: "${frontmatter.date}"`);
    if (frontmatter.tags && frontmatter.tags.length) {
      fmLines.push("tags:");
      for (const t of frontmatter.tags) {
        fmLines.push(`  - "${t.toString().replace(/"/g, '\\"')}"`);
      }
    }
    fmLines.push(`layout: "${frontmatter.layout}"`);
    fmLines.push("---\n");

    const fileContent = fmLines.join("\n") + md;

    await fs.writeFile(outPath, fileContent, "utf8");
    console.log("Wrote", outPath);
  }

  console.log("Import complete.");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
