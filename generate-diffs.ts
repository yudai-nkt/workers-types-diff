import { createTwoFilesPatch } from "diff";
import got from "got";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extract } from "tar";

const extractDir = mkdtempSync(join(tmpdir(), "workers-types-diff"));
console.log(extractDir);
const metadata = await got(
  "https://registry.npmjs.org/@cloudflare/workers-types"
).json();

got
  //@ts-expect-error
  .stream(metadata.versions[metadata["dist-tags"].latest].dist.tarball)
  .pipe(extract({ cwd: extractDir }))
  .on("finish", () => {
    const source = join(extractDir, "package");
    const compatibilityDates = readdirSync(join(source), {
      withFileTypes: true,
    }).filter(
      (dirent) => dirent.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(dirent.name)
    );

    const diffs: Record<string, string> = {};

    let index = compatibilityDates.length;

    while (index-- > 0) {
      const newVersion = compatibilityDates[index].name;
      const oldVersion =
        index === 0 ? "oldest" : compatibilityDates[index - 1].name;
      const newDefinition = readFileSync(
        join(source, newVersion, "index.d.ts"),
        { encoding: "utf8" }
      );
      const oldDefinition = readFileSync(
        join(source, oldVersion, "index.d.ts"),
        { encoding: "utf8" }
      );
      diffs[newVersion] = createTwoFilesPatch(
        oldVersion,
        newVersion,
        oldDefinition,
        newDefinition
      );
    }

    writeFileSync("patches.json", JSON.stringify(diffs));
  });
