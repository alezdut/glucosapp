const path = require("path");

const groupByWorkspace = (files) => {
  const groups = new Map();

  for (const file of files) {
    const relativeToRepo = path.isAbsolute(file) ? path.relative(process.cwd(), file) : file;
    const normalized = relativeToRepo.split(path.sep).join("/");
    const parts = normalized.split("/");

    let workspace;
    if (parts[0] === "apps" || parts[0] === "packages") {
      workspace = `${parts[0]}/${parts[1]}`;
    } else {
      workspace = ".";
    }

    if (!groups.has(workspace)) {
      groups.set(workspace, []);
    }

    groups.get(workspace).push(normalized);
  }

  return groups;
};

const toWorkspaceCommand = (workspace, files) => {
  const relativeFiles =
    workspace === "." ? files : files.map((file) => file.replace(new RegExp(`^${workspace}/`), ""));

  const noIgnore = workspace === "apps/backend" ? " --no-ignore" : "";
  const cwd = workspace === "." ? "" : ` -C ${workspace}`;

  return `pnpm${cwd} exec eslint --max-warnings=0${noIgnore} ${relativeFiles.join(" ")}`;
};

module.exports = {
  "*.{json,md,cjs,js,jsx,ts,tsx}": ["prettier --write"],
  "*.{cjs,js,jsx,ts,tsx}": (files) => {
    const groups = groupByWorkspace(files);

    return Array.from(groups.entries())
      .filter(([workspace]) => workspace !== ".")
      .map(([workspace, workspaceFiles]) => toWorkspaceCommand(workspace, workspaceFiles));
  },
};
