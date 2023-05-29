import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs.js";
import { info, success } from "../utils/log.js";
import {
  downloadImages,
  filterHtml,
  findImageMediaIds,
  formatObjectAsJson,
  formatStringAsHtml,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping.js";

export async function scrapePosts({
  apiUrl,
  dataDir,
  classFilters,
  idFilters,
  elementFilters,
  jsonFilters,
  removeAttributes,
  removeAllAttributes,
  removeEmptyElements,
  limitPages,
}) {
  info(`Scraping ${chalk.blue("posts")}...`, true);

  const postsApiUrl = `${apiUrl}/posts`;
  const postsDir = `${dataDir}/posts`;

  await mkdir(postsDir, { recursive: true });

  const saveUnmodifiedHtml =
    classFilters.length > 0 ||
    idFilters.length > 0 ||
    elementFilters.length > 0 ||
    removeAttributes.length > 0 ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape(postsApiUrl, limitPages, async (posts) => {
    if (!Array.isArray(posts) || posts.length === 0) {
      info("No posts found.");
      cleanDir(postsDir, true);

      return;
    }

    for (const post of posts) {
      const postIdentifier = `${post.id}-${post.slug}`;
      const postDir = `${postsDir}/${postIdentifier}`;

      info(`Scraping post ${chalk.blue(postIdentifier)}...`);

      await cleanDir(postDir, true, true);

      await writeFile(`${postDir}/full-data.json`, formatObjectAsJson(post));

      await writeFile(
        `${postDir}/meta-data.json`,
        formatObjectAsJson(getMetadata(post, jsonFilters))
      );

      await writeFile(
        `${postDir}/links.json`,
        formatObjectAsJson(getLinks(post))
      );

      await writeFile(
        `${postDir}/rendered-content.html`,
        formatStringAsHtml(
          filterHtml(post.content.rendered, {
            classFilters,
            idFilters,
            elementFilters,
            removeAttributes,
            removeAllAttributes,
            removeEmptyElements,
          })
        )
      );

      await writeFile(
        `${postDir}/rendered-excerpt.html`,
        formatStringAsHtml(
          filterHtml(post.excerpt.rendered, {
            classFilters,
            idFilters,
            elementFilters,
            removeAttributes,
            removeAllAttributes,
            removeEmptyElements,
          })
        )
      );

      if (saveUnmodifiedHtml) {
        await writeFile(
          `${postDir}/rendered-content-unmodified.html`,
          formatStringAsHtml(post.content.rendered)
        );

        await writeFile(
          `${postDir}/rendered-excerpt-unmodified.html`,
          formatStringAsHtml(post.excerpt.rendered)
        );
      }

      const mediaIds = [
        ...(post.featured_media ? [post.featured_media] : []),
        ...(await findImageMediaIds(post.content.rendered)),
      ];

      if (mediaIds.length > 0) {
        info(`Found ${chalk.blue(mediaIds.length)} image(s).`);
        const imagesDir = `${postDir}/images`;
        await mkdir(imagesDir, { recursive: true });
        await downloadImages(mediaIds, apiUrl, imagesDir);
      }

      success("Done.", true);
    }
  });

  success("Done scraping posts.", true);
}
