import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { cleanDir } from "../utils/fs";
import { info, success } from "../utils/log";
import {
  filterHtml,
  formatAsJson,
  formatStringAsHtml,
  getLinks,
  getMetadata,
  paginatedScrape,
} from "../utils/scraping";

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
  info(`Scraping ${chalk.blue("comments")}...`, true);

  const commentsApiUrl = `${apiUrl}/comments`;
  const commentsDir = `${dataDir}/comments`;

  await mkdir(commentsDir, { recursive: true });

  const saveUnmodifiedHtml =
    (classFilters && classFilters.length > 0) ||
    (idFilters && idFilters.length > 0) ||
    (elementFilters && elementFilters.length > 0) ||
    (removeAttributes && removeAttributes.length > 0) ||
    removeAllAttributes ||
    removeEmptyElements;

  await paginatedScrape({
    url: commentsApiUrl,
    order,
    limitItems,
    dataHandler: async (comments) => {
      if (!Array.isArray(comments) || comments.length === 0) {
        info("No comments found.");
        cleanDir(commentsDir, true);

        return;
      }

      for (const comment of comments) {
        if (
          typeof comment === "object" &&
          "post" in comment &&
          "id" in comment
        ) {
          const commentIdentifier = `${comment.post}-${comment.id}`;
          const commentDir = `${commentsDir}/${commentIdentifier}`;

          info(`Scraping comment ${chalk.blue(commentIdentifier)}...`);

          await cleanDir(commentDir, true, true);

          await writeFile(
            `${commentDir}/full-data.json`,
            await formatAsJson(comment),
          );

          await writeFile(
            `${commentDir}/meta-data.json`,
            await formatAsJson(getMetadata(comment, jsonFilters)),
          );

          await writeFile(
            `${commentDir}/links.json`,
            await formatAsJson(getLinks(comment)),
          );

          if (
            "content" in comment &&
            typeof comment.content === "object" &&
            "rendered" in comment.content &&
            typeof comment.content.rendered === "string"
          ) {
            await writeFile(
              `${commentDir}/rendered-content.html`,
              await formatStringAsHtml(
                filterHtml(comment.content.rendered, {
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
                `${commentDir}/rendered-content-unmodified.html`,
                await formatStringAsHtml(comment.content.rendered),
              );
            }
          }

          success("Done.", true);
        }
      }
    },
  });

  success("Done scraping comments.", true);
}
