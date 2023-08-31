import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs";
import { info, success } from "../utils/log";
import {
  downloadImages,
  filterHtml,
  findImageMediaIds,
  formatAsJson,
  formatStringAsHtml,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping";

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
  order,
  limitItems,
}: {
  apiUrl: string;
  dataDir: string;
  classFilters?: string[];
  idFilters?: string[];
  elementFilters?: string[];
  jsonFilters?: string[];
  removeAttributes?: string[];
  removeAllAttributes?: boolean;
  removeEmptyElements?: boolean;
  order?: string;
  limitItems?: number;
}) {
  info(`Scraping ${chalk.blue("posts")}...`, true);

  const postsApiUrl = `${apiUrl}/posts`;
  const postsDir = `${dataDir}/posts`;

  await mkdir(postsDir, { recursive: true });

  const saveUnmodifiedHtml =
    (classFilters && classFilters.length > 0) ||
    (idFilters && idFilters.length > 0) ||
    (elementFilters && elementFilters.length > 0) ||
    (removeAttributes && removeAttributes.length > 0) ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape({
    url: postsApiUrl,
    order,
    limitItems,
    dataHandler: async (posts) => {
      if (!Array.isArray(posts) || posts.length === 0) {
        info("No posts found.");
        cleanDir(postsDir, true);

        return;
      }

      for (const post of posts) {
        if (typeof post === "object" && "post" in post && "id" in post) {
          const postIdentifier = `${post.id}-${post.slug}`;
          const postDir = `${postsDir}/${postIdentifier}`;

          info(`Scraping post ${chalk.blue(postIdentifier)}...`);

          await cleanDir(postDir, true, true);

          await writeFile(
            `${postDir}/full-data.json`,
            await formatAsJson(post),
          );

          await writeFile(
            `${postDir}/meta-data.json`,
            await formatAsJson(getMetadata(post, jsonFilters)),
          );

          await writeFile(
            `${postDir}/links.json`,
            await formatAsJson(getLinks(post)),
          );

          const mediaIds: number[] = [];

          if (post.featured_media && typeof post.featured_media === "number") {
            mediaIds.push(post.featured_media);
          }

          if (
            "content" in post &&
            typeof post.content === "object" &&
            "rendered" in post.content &&
            typeof post.content.rendered === "string"
          ) {
            await writeFile(
              `${postDir}/rendered-content.html`,
              await formatStringAsHtml(
                filterHtml(post.content.rendered, {
                  classFilters,
                  idFilters,
                  elementFilters,
                  removeAttributes,
                  removeAllAttributes,
                  removeEmptyElements,
                }),
              ),
            );

            if (saveUnmodifiedHtml) {
              await writeFile(
                `${postDir}/rendered-content-unmodified.html`,
                await formatStringAsHtml(post.content.rendered),
              );
            }

            mediaIds.push(...(await findImageMediaIds(post.content.rendered)));
          }

          if (
            "excerpt" in post &&
            typeof post.excerpt === "object" &&
            "rendered" in post.excerpt &&
            typeof post.excerpt.rendered === "string"
          ) {
            await writeFile(
              `${postDir}/rendered-excerpt.html`,
              await formatStringAsHtml(
                filterHtml(post.excerpt.rendered, {
                  classFilters,
                  idFilters,
                  elementFilters,
                  removeAttributes,
                  removeAllAttributes,
                  removeEmptyElements,
                }),
              ),
            );

            if (saveUnmodifiedHtml) {
              await writeFile(
                `${postDir}/rendered-excerpt-unmodified.html`,
                await formatStringAsHtml(post.excerpt.rendered),
              );
            }
          }

          if (mediaIds.length > 0) {
            info(`Found ${chalk.blue(mediaIds.length)} image(s).`);
            const imagesDir = `${postDir}/images`;
            await mkdir(imagesDir, { recursive: true });
            await downloadImages(mediaIds, apiUrl, imagesDir);
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping posts.", true);
}
