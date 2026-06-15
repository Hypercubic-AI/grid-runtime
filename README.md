# Grid Runtime

A small visualization runtime. It renders a grid world and animates an agent that
follows a list of low-level instructions (`MOVE`, `TURN`, `REPEAT`, `ARRIVE`),
enforcing simple movement rules (you can't drive off the grid, into a building, or
into construction).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll see the bundled sample animate.

## Run your own program

Write a `directions.json` file at the repository root, for example:

```json
{ "instructions": [ { "op": "MOVE", "n": 30 }, { "op": "TURN", "dir": "LEFT" }, { "op": "MOVE", "n": 10 }, { "op": "ARRIVE" } ] }
```

The view polls this file and re-runs automatically whenever it changes. See
`src/data/samples/` for more examples.

## Tests

```bash
npm test
```
