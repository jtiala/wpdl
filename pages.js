import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import {
  cleanDir,
  filterHtml,
  filterJSON,
  formatObjectAsJson,
  formatStringAsHtml,
  info,
  paginatedScrape,
  success,
} from "./utils.js";

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
  info("--- pages ---");

  const pagesApiUrl = `${apiUrl}/pages`;
  const pagesDir = `${dataDir}/pages`;

  await mkdir(pagesDir, { recursive: true });

  const saveUnmodifiedHtml =
    !!classFilters ||
    !!idFilters ||
    !!elementFilters ||
    !!removeAttributes ||
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

      info(`Scraped page ${chalk.blue(pageIdentifier)}`);
    }
  });

  success("Done.");
}
