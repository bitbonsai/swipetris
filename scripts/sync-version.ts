// Syncs the menu version label in play.html with package.json.
// Run after bumping package.json: bun run sync:version
import pkg from "../package.json";

const path = "public/play.html";
const html = await Bun.file(path).text();
const next = html.replace(
  /(<p class="menu-meta dim version">)v[^<]+(<\/p>)/,
  `$1v${pkg.version}$2`
);
if (next === html) {
  console.log(`play.html already at v${pkg.version}`);
} else {
  await Bun.write(path, next);
  console.log(`play.html updated to v${pkg.version}`);
}
