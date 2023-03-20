import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import {
  cleanDir,
  filterHtml,
  filterJSON,
  formatObjectAsJson,
  formatStringAsHtml,
  info,
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
  removeEmptyElements,
}) {
  const pagesApiUrl = `${apiUrl}/pages`;
  const pagesDir = `${dataDir}/pages`;

  const saveUnmodifiedHtml =
    !!classFilters || !!idFilters || !!elementFilters || removeEmptyElements;

  info("--- pages ---");
  info(`Scraping pages from ${chalk.blue(pagesApiUrl)} ...`);

  await mkdir(pagesDir, { recursive: true });

  const pages = await (await fetch(pagesApiUrl)).json();

  if (!Array.isArray(pages) || pages.length === 0) {
    info("No pages found.");
    cleanDir(pagesDir, true);

    return;
  }

  await writeFile(`${pagesDir}/all-pages.json`, formatObjectAsJson(pages));

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

  success("Done.");
}
