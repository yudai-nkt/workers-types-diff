import { createTwoFilesPatch } from "diff";
import got from "got";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extract } from "tar";

const extractDir = mkdtempSync(join(tmpdir(), "workers-types-diff"));
const metadata = await got(
  "https://registry.npmjs.org/@cloudflare/workers-types"
).json();

got
  //@ts-expect-error
  .stream(metadata.versions[metadata["dist-tags"].latest].dist.tarball)
  .pipe(extract({ cwd: extractDir }))
  .on("finish", () => {
    const source = join(extractDir, "package");
    const compatibilityDates = readdirSync(source, {
      withFileTypes: true,
    }).filter(
      (dirent) => dirent.isDirectory() && /\d{4}-\d{2}-\d{2}/.test(dirent.name)
    );

    const patches: Record<string, string> = {};

    let index = compatibilityDates.length;
    while (index-- > 0) {
      const curr = compatibilityDates[index].name;
      const prev = index === 0 ? "oldest" : compatibilityDates[index - 1].name;
      patches[curr] = createTwoFilesPatch(
        prev,
        curr,
        readFileSync(join(source, prev, "index.d.ts"), "utf8"),
        readFileSync(join(source, curr, "index.d.ts"), "utf8")
      );
    }

    writeFileSync("patches.json", JSON.stringify(patches));
  });
