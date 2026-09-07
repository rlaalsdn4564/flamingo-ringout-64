import { createMatch, step, cpuInput, FIXED_DT } from "../src/engine.js";
import { FIGHTERS, STAGES } from "../src/data.js";
const matches = [];
for (const stage of STAGES)
  for (const player of FIGHTERS)
    for (const cpu of FIGHTERS) {
      const m = createMatch({
        player: player.id,
        cpu: cpu.id,
        stage: stage.id,
        seed: 907,
      });
      while (m.phase !== "result" && m.elapsed < 215) {
        const input = cpuInput(m, m.fighters[0], m.fighters[1], FIXED_DT);
        step(m, input, FIXED_DT);
      }
      if (m.phase !== "result")
        throw new Error(`Unfinished: ${stage.id}/${player.id}/${cpu.id}`);
      matches.push({
        stage: stage.id,
        player: player.id,
        cpu: cpu.id,
        winner: m.winner === null ? "draw" : m.fighters[m.winner].id,
        seconds: +m.elapsed.toFixed(2),
        stocks: m.fighters.map((f) => f.stocks),
        kos: m.fighters.map((f) => f.koCount),
        percent: m.fighters.map((f) => +f.percent.toFixed(2)),
      });
    }
console.log(
  JSON.stringify(
    {
      description:
        "Headless mechanics simulation, not browser or human play verification",
      seed: 907,
      count: matches.length,
      matches,
    },
    null,
    2,
  ),
);
