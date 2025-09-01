const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginNavigation = require("@11ty/eleventy-navigation");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets"); // if you have static assets
  eleventyConfig.addWatchTarget("src/assets"); // watch for changes in assets
  // eleventyConfig.addPassthroughCopy("src/assets/css");
  // eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/CNAME"); // Make sure to copy CNAME file for custom domains

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.addCollection("posts", collectionApi =>
    collectionApi.getFilteredByGlob("src/posts/*.md").reverse()
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_includes/layouts",
      output: "public"
    },
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
