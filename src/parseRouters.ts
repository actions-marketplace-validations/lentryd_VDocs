import { RouteRecordRaw } from "vue-router";

const EXT_REGEX = /(?!^)\..*$/;
const DIR_REGEX = /\/(.*?)\//;

function parseFile(paths: string[], rootPath = "/"): RouteRecordRaw[] {
  return paths.map((p) => {
    p = rootPath + p.replace(/^\//, "");

    let path = p;
    const name = require("@/pages" + p)?.default?.name ?? "";
    const ext = name.match(EXT_REGEX)?.[0] ?? "";
    const isImage = !name && !ext;
    if (!isImage) path = path.replace(EXT_REGEX, ext);
    path = path.replaceAll("$1", ".");

    return !isImage
      ? {
          path,
          meta: { name, isMD: ext === ".md" },
          component: () => import("@/pages" + p),
        }
      : {
          path,
          meta: {
            name: p.replace(/^.*[\\\/]/, ""),
            isMD: true,
            image: require("@/pages" + p),
          },
          component: () => import("@/components/ImageViewer.vue"),
        };
  });
}

function parseDir(paths: string[], dir = "", rootPath = "/"): RouteRecordRaw[] {
  if (dir) paths = paths.map((p) => p.replace(DIR_REGEX, "/"));

  const files = parseFile(
    paths.filter((p) => !DIR_REGEX.test(p)),
    rootPath
  );
  let dirs = paths.filter((p) => DIR_REGEX.test(p));

  const content: RouteRecordRaw[] = [...files];
  const result = files.map(({ meta, path }) => ({
    name: meta?.name,
    path,
    isDir: false,
  }));
  while (dirs.length > 0) {
    let dir = dirs[0].match(DIR_REGEX)?.[1] ?? "";
    const paths = dirs.filter((p) => p.startsWith("/" + dir));

    content.push(...parseDir(paths, dir, rootPath + dir + "/"));
    dirs = dirs.filter((p) => !p.startsWith("/" + dir));

    dir = dir.replaceAll("$1", ".");
    result.push({
      name: dir,
      path: rootPath.replaceAll("$1", ".") + dir + "/",
      isDir: true,
    });
  }

  return [
    ...content,
    {
      path: rootPath.replaceAll("$1", "."),
      meta: { name: dir.replaceAll("$1", "."), isDir: true },
      props: { result },
      component: () => import("@/components/Dir.vue"),
    },
  ];
}

export default function (paths: string[]) {
  return parseDir(paths).map((p) => ({
    ...p,
    path: p.path.replace(/^\//, ""),
  }));
}
