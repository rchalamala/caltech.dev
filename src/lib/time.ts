import { Maybe } from "../types";

export interface TimeInterval {
  start: Date;
  end: Date;
}

const DAY_TO_INDEX = ["M", "T", "W", "R", "F"] as const;

export function parseTimes(times: string): Maybe<TimeInterval>[][] {
  const parsedTimes: Maybe<TimeInterval>[][] = [[], [], [], [], []];

  if (times === "A") {
    return parsedTimes;
  }

  const normalizedLines = times
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "A");

  for (const line of normalizedLines.join("\n").split(/[,\n]/)) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(/([MTWRF]+) (\d\d):(\d\d) - (\d\d):(\d\d)/);

    if (match === null) {
      continue;
    }

    for (const day of match[1]) {
      parsedTimes[DAY_TO_INDEX.indexOf(day as (typeof DAY_TO_INDEX)[number])].push({
        start: new Date(
          2018,
          0,
          DAY_TO_INDEX.indexOf(day as (typeof DAY_TO_INDEX)[number]) + 1,
          parseInt(match[2], 10),
          parseInt(match[3], 10),
        ),
        end: new Date(
          2018,
          0,
          DAY_TO_INDEX.indexOf(day as (typeof DAY_TO_INDEX)[number]) + 1,
          parseInt(match[4], 10) === 23 ? 11 : parseInt(match[4], 10),
          parseInt(match[5], 10),
        ),
      });
    }
  }

  return parsedTimes;
}
