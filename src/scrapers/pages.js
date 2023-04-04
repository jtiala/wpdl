import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs.js";
import { info, success } from "../utils/log.js";
import {
  downloadImages,
  filterHtml,
  filterJSON,
  findImageMediaIds,
  formatObjectAsJson,
  formatStringAsHtml,
  paginatedScrape,
} from "../utils/scraping.js";

function getPageMetadata(page, jsonFilters) {
  const defaultRemoveKeys = ["content", "excerpt", "_links"];

  return filterJSON(page, [...defaultRemoveKeys, ...jsonFilters]);
}

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
  limitPages,
}) {
  info(`Scraping ${chalk.blue("pages")}...`, true);

  const pagesApiUrl = `${apiUrl}/pages`;
  const pagesDir = `${dataDir}/pages`;

  await mkdir(pagesDir, { recursive: true });

  const saveUnmodifiedHtml =
    classFilters.length > 0 ||
    idFilters.length > 0 ||
    elementFilters.length > 0 ||
    removeAttributes.length > 0 ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape(pagesApiUrl, limitPages, async (pages) => {
    if (!Array.isArray(pages) || pages.length === 0) {
      info("No pages found.");
      cleanDir(pagesDir, true);

      return;
    }

    for (const page of pages) {
      const pageIdentifier = `${page.id}-${page.slug}`;
      const pageDir = `${pagesDir}/${pageIdentifier}`;

      info(`Scraping page ${chalk.blue(pageIdentifier)}...`);

      await cleanDir(pageDir, true, true);

      await writeFile(`${pageDir}/full-data.json`, formatObjectAsJson(page));

      await writeFile(
        `${pageDir}/meta-data.json`,
        formatObjectAsJson(getPageMetadata(page, jsonFilters))
      );

      await writeFile(
        `${pageDir}/rendered-content.html`,
        formatStringAsHtml(
          filterHtml(page.content.rendered, {
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
        `${pageDir}/rendered-excerpt.html`,
        formatStringAsHtml(
          filterHtml(page.excerpt.rendered, {
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
          `${pageDir}/rendered-content-unmodified.html`,
          formatStringAsHtml(page.content.rendered)
        );

        await writeFile(
          `${pageDir}/rendered-excerpt-unmodified.html`,
          formatStringAsHtml(page.excerpt.rendered)
        );
      }

      const mediaIds = [
        ...(page.featured_media ? [page.featured_media] : []),
        ...(await findImageMediaIds(page.content.rendered)),
      ];

      if (mediaIds.length > 0) {
        info(`Found ${chalk.blue(mediaIds.length)} image(s).`);
        const imagesDir = `${pageDir}/images`;
        await mkdir(imagesDir, { recursive: true });
        await downloadImages(mediaIds, apiUrl, imagesDir);
      }

      success("Done.", true);
    }
  });

  success("Done scraping pages.", true);
}
