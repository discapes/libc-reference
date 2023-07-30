import { readFile, readdir, writeFile } from "fs/promises";
import { runThreads } from "./runner.js";
import { load as loadCheerio } from "cheerio";

type Standard = "iso" | "posix" | "other";

type Page = {
	name: string;
	man: string;
};

type CatPage = {
	standard: Standard;
	name: string;
	man: string;
};

const files: Page[] = (
	await Promise.all([
		readdir("man2").then((arr) => arr.map((name) => ({ name, man: "man2" }))),
		readdir("man3").then((arr) => arr.map((name) => ({ name, man: "man3" }))),
	])
).flat();

const results: CatPage[] = await runThreads(files, categorize, 100);
const descriptions = (await readFile("descriptions.html"))
	.toString()
	.split("\n");

const $ = loadCheerio(await readFile("template.html"));
const category = (name, id) =>
	`<div class="category_outer">
		<div class="category_heading">
			<h2>${name}</h2>
			<input
				type="checkbox"
				onclick="document.getElementById('cat_${id}').style.display=event.target.checked?'flex':'none'"
				checked="true"
			/>
		</div>
		<div class="category_inner" id="cat_${id}"></div>
	</div>`;

$("#container").append(category("ISO STANDARD C", "iso"));
$("#container").append(category("POSIX", "posix"));
$("#container").append(category("OTHER (LINUX/GCC)", "other"));

for (const page of results) {
	console.log(page);
	$("<a></a>")
		.text(
			page.name.slice(0, page.name.indexOf(".")) + " - " + getDescription(page)
		)
		.attr("href", page.man + "/" + page.name)
		.appendTo("#cat_" + page.standard);
}

writeFile("index.html", $.html());

function getDescription(page: Page) {
	const path = page.man + "/" + page.name;
	const line = descriptions.find((line) => line.includes(path));
	return line?.slice(line?.lastIndexOf("-") + 1);
}

async function categorize(page: Page): Promise<CatPage> {
	const content = await readFile(page.man + "/" + page.name);
	const $ = loadCheerio(content);
	const std = $("#STANDARDS").parent().next().text().trim();
	let standard: Standard;

	if (
		std.includes("C11") ||
		std.includes("C17") ||
		std.includes("C99") ||
		std.includes("C89")
	) {
		standard = "iso";
	} else if (std.includes("POSIX")) {
		standard = "posix";
	} else {
		standard = "other";
	}

	return {
		...page,
		standard,
	};
}
