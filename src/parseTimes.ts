export type TimeInterval = {
  start: Date;
  end: Date;
};

export function parseTimes(times: string): Maybe<TimeInterval>[][] {
  const ret: Maybe<TimeInterval>[][] = [[], [], [], [], []];
  // TODO: Include Sat/Sun Courses, OM Courses
  const day_to_i = new Map([
    ["M", 0],
    ["T", 1],
    ["W", 2],
    ["R", 3],
    ["F", 4],
  ]);

  // super hacky fix for a parsing bug when location is A
  let times_clean = times.replace("\nA", "");

  for (let line of times_clean.split(/[,\n]/)) {
    const match = line.match(/([MTWRF]+) (\d\d):(\d\d) - (\d\d):(\d\d)/);
    if (match !== null) {
      //  An example match: [ "MWF 14:00 - 14:55", "MWF", "14", "00", "14", "55" ]
      for (const day of match[1]) {
        const dayIdx = day_to_i.get(day)!;
        ret[dayIdx].push({
          start: new Date(
            2018,
            0,
            dayIdx + 1,
            parseInt(match[2]),
            parseInt(match[3]),
          ),
          end: new Date(
            2018,
            0,
            dayIdx + 1,
            // stupid hacky thing to avoid crashing when time is entered incorrectly in catalog (11pm instead of 11am)
            parseInt(match[4]) === 23 ? 11 : parseInt(match[4]),
            parseInt(match[5]),
          ),
        });
      }
    }
  }
  return ret;
}
