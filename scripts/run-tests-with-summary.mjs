#!/usr/bin/env node

import { spawn } from "node:child_process";
import readline from "node:readline";

const statsByTask = new Map();
const useColor = !process.env.NO_COLOR;

const color = {
    cyan: (value) => (useColor ? `\u001b[36m${value}\u001b[39m` : value),
    green: (value) => (useColor ? `\u001b[32m${value}\u001b[39m` : value),
    yellow: (value) => (useColor ? `\u001b[33m${value}\u001b[39m` : value),
    bold: (value) => (useColor ? `\u001b[1m${value}\u001b[22m` : value),
};

const ensureStats = (taskKey) => {
    if (!statsByTask.has(taskKey)) {
        statsByTask.set(taskKey, {
            suitesPassed: 0,
            suitesTotal: 0,
            testsPassed: 0,
            testsTotal: 0,
            snapshotsTotal: 0,
            hasAny: false,
        });
    }

    return statsByTask.get(taskKey);
};

const stripAnsi = (value) =>
    value.replace(
        // eslint-disable-next-line no-control-regex
        /\u001b\[[0-?]*[ -/]*[@-~]/g,
        "",
    );

const suiteRegex = /Test Suites:\s*(\d+)\s*passed,\s*(?:(\d+)\s*of\s*)?(\d+)\s*total/i;
const testsRegex = /Tests:\s*(\d+)\s*passed,\s*(\d+)\s*total/i;
const snapshotsRegex = /Snapshots:\s*(\d+)\s*total/i;

const child = spawn("pnpm", ["turbo", "run", "test"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
});

const parseLine = (line) => {
    const cleanLine = stripAnsi(line);
    const taskMatch = cleanLine.match(/^([^\s:]+:test):\s*(.*)$/);
    const taskKey = taskMatch ? taskMatch[1] : "global";
    const payload = taskMatch ? taskMatch[2] : cleanLine;
    const stats = ensureStats(taskKey);

    const suiteMatch = payload.match(suiteRegex);
    if (suiteMatch) {
        stats.suitesPassed = Number.parseInt(suiteMatch[1], 10);
        const totalGroup = suiteMatch[3] ?? suiteMatch[2];
        stats.suitesTotal = Number.parseInt(totalGroup, 10);
        stats.hasAny = true;
    }

    const testsMatch = payload.match(testsRegex);
    if (testsMatch) {
        stats.testsPassed = Number.parseInt(testsMatch[1], 10);
        stats.testsTotal = Number.parseInt(testsMatch[2], 10);
        stats.hasAny = true;
    }

    const snapshotsMatch = payload.match(snapshotsRegex);
    if (snapshotsMatch) {
        stats.snapshotsTotal = Number.parseInt(snapshotsMatch[1], 10);
        stats.hasAny = true;
    }
};

const wireStream = (stream, writer) => {
    const rl = readline.createInterface({ input: stream });
    rl.on("line", (line) => {
        parseLine(line);
        writer.write(`${line}\n`);
    });
};

wireStream(child.stdout, process.stdout);
wireStream(child.stderr, process.stderr);

child.on("close", (code) => {
    const projectStats = [...statsByTask.entries()].filter(
        ([taskKey, stats]) => taskKey !== "global" && stats.hasAny,
    );

    if (projectStats.length > 0) {
        const totals = projectStats.reduce(
            (acc, [, stats]) => {
                acc.suitesPassed += stats.suitesPassed;
                acc.suitesTotal += stats.suitesTotal;
                acc.testsPassed += stats.testsPassed;
                acc.testsTotal += stats.testsTotal;
                acc.snapshotsTotal += stats.snapshotsTotal;
                return acc;
            },
            {
                suitesPassed: 0,
                suitesTotal: 0,
                testsPassed: 0,
                testsTotal: 0,
                snapshotsTotal: 0,
            },
        );

        process.stdout.write(`\n${color.bold(color.cyan("===== Resumen Global de Tests ====="))}\n`);
        projectStats.forEach(([taskKey, stats]) => {
            process.stdout.write(
                `${color.cyan(taskKey)} -> suites ${color.green(`${stats.suitesPassed}/${stats.suitesTotal}`)}, tests ${color.green(`${stats.testsPassed}/${stats.testsTotal}`)}\n`,
            );
        });
        process.stdout.write(`${color.cyan("-----------------------------------")}\n`);
        process.stdout.write(
            `Suites: ${color.green(`${totals.suitesPassed} passed`)} / ${color.green(`${totals.suitesTotal} total`)}\n`,
        );
        process.stdout.write(
            `Tests: ${color.green(`${totals.testsPassed} passed`)} / ${color.green(`${totals.testsTotal} total`)}\n`,
        );
        process.stdout.write(`Snapshots: ${color.yellow(`${totals.snapshotsTotal} total`)}\n`);
        process.stdout.write(`${color.cyan("===================================")}\n\n`);
    } else {
        process.stdout.write(
            "\n[resumen] No se detectaron bloques de resumen de Jest para agregar totales globales.\n\n",
        );
    }

    process.exit(code ?? 1);
});
