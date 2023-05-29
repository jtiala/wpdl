import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs.js";
import { info, success } from "../utils/log.js";
import {
  filterHtml,
  formatObjectAsJson,
  formatStringAsHtml,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping.js";

export async function scrapeComments({
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
  info(`Scraping ${chalk.blue("comments")}...`, true);

  const commentsApiUrl = `${apiUrl}/comments`;
  const commentsDir = `${dataDir}/comments`;

  await mkdir(commentsDir, { recursive: true });

  const saveUnmodifiedHtml =
    classFilters.length > 0 ||
    idFilters.length > 0 ||
    elementFilters.length > 0 ||
    removeAttributes.length > 0 ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape(commentsApiUrl, limitPages, async (comments) => {
    if (!Array.isArray(comments) || comments.length === 0) {
      info("No comments found.");
      cleanDir(commentsDir, true);

      return;
    }

    for (const comment of comments) {
      const commentIdentifier = `${comment.post}-${comment.id}`;
      const commentDir = `${commentsDir}/${commentIdentifier}`;

      info(`Scraping comment ${chalk.blue(commentIdentifier)}...`);

      await cleanDir(commentDir, true, true);

      await writeFile(
        `${commentDir}/full-data.json`,
        formatObjectAsJson(comment)
      );

      await writeFile(
        `${commentDir}/meta-data.json`,
        formatObjectAsJson(getMetadata(comment, jsonFilters))
      );

      await writeFile(
        `${commentDir}/links.json`,
        formatObjectAsJson(getLinks(comment))
      );

      await writeFile(
        `${commentDir}/rendered-content.html`,
        formatStringAsHtml(
          filterHtml(comment.content.rendered, {
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
          `${commentDir}/rendered-content-unmodified.html`,
          formatStringAsHtml(comment.content.rendered)
        );
      }

      success("Done.", true);
    }
  });

  success("Done scraping comments.", true);
}
