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

export async function scrapePages({
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
  info(`Scraping ${chalk.blue("pages")}...`, true);

  const pagesApiUrl = `${apiUrl}/pages`;
  const pagesDir = `${dataDir}/pages`;

  await mkdir(pagesDir, { recursive: true });

  const saveUnmodifiedHtml =
    (classFilters && classFilters.length > 0) ||
    (idFilters && idFilters.length > 0) ||
    (elementFilters && elementFilters.length > 0) ||
    (removeAttributes && removeAttributes.length > 0) ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape({
    url: pagesApiUrl,
    order,
    limitItems,
    dataHandler: async (pages) => {
      if (!Array.isArray(pages) || pages.length === 0) {
        info("No pages found.");
        cleanDir(pagesDir, true);

        return;
      }

      for (const page of pages) {
        if (typeof page === "object" && "post" in page && "id" in page) {
          const pageIdentifier = `${page.id}-${page.slug}`;
          const pageDir = `${pagesDir}/${pageIdentifier}`;

          info(`Scraping page ${chalk.blue(pageIdentifier)}...`);

          await cleanDir(pageDir, true, true);

          await writeFile(
            `${pageDir}/full-data.json`,
            await formatAsJson(page),
          );

          await writeFile(
            `${pageDir}/meta-data.json`,
            await formatAsJson(getMetadata(page, jsonFilters)),
          );

          await writeFile(
            `${pageDir}/links.json`,
            await formatAsJson(getLinks(page)),
          );

          const mediaIds: number[] = [];

          if (page.featured_media && typeof page.featured_media === "number") {
            mediaIds.push(page.featured_media);
          }

          if (
            "content" in page &&
            typeof page.content === "object" &&
            "rendered" in page.content &&
            typeof page.content.rendered === "string"
          ) {
            await writeFile(
              `${pageDir}/rendered-content.html`,
              await formatStringAsHtml(
                filterHtml(page.content.rendered, {
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
                `${pageDir}/rendered-content-unmodified.html`,
                await formatStringAsHtml(page.content.rendered),
              );
            }

            mediaIds.push(...(await findImageMediaIds(page.content.rendered)));
          }

          if (
            "excerpt" in page &&
            typeof page.excerpt === "object" &&
            "rendered" in page.excerpt &&
            typeof page.excerpt.rendered === "string"
          ) {
            await writeFile(
              `${pageDir}/rendered-excerpt.html`,
              await formatStringAsHtml(
                filterHtml(page.excerpt.rendered, {
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
                `${pageDir}/rendered-excerpt-unmodified.html`,
                await formatStringAsHtml(page.excerpt.rendered),
              );
            }
          }

          if (mediaIds.length > 0) {
            info(`Found ${chalk.blue(mediaIds.length)} image(s).`);
            const imagesDir = `${pageDir}/images`;
            await mkdir(imagesDir, { recursive: true });
            await downloadImages(mediaIds, apiUrl, imagesDir);
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping pages.", true);
}
