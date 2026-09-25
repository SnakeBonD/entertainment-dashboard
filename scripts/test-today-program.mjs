import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("../js/today-program.js", import.meta.url), "utf8"), context);
const program = context.window.SnakeBonDTodayProgram;
const memory = new Map();
const storage = { getItem:key=>memory.get(key)??null, setItem:(key,value)=>memory.set(key,value), removeItem:key=>memory.delete(key) };
const now = new Date("2026-09-22T10:00:00Z");
const item = (id) => ({ id, title:`Choix ${id}`, meta:"Source officielle", url:`https://example.com/${id}`, group:"new" });

assert.equal(program.MAX_ITEMS, 3);
assert.deepEqual(Array.from(program.read(storage, now)), []);
assert.equal(program.add(item("a"), storage, now).status, "added");
assert.equal(program.add(item("a"), storage, now).status, "duplicate");
assert.equal(program.add(item("b"), storage, now).status, "added");
assert.equal(program.add(item("c"), storage, now).status, "added");
assert.equal(program.add(item("d"), storage, now).status, "full");
assert.deepEqual(Array.from(program.read(storage, now), (entry) => entry.id), ["a", "b", "c"]);
assert.deepEqual(Array.from(program.move("c", "up", storage, now), (entry) => entry.id), ["a", "c", "b"]);
assert.deepEqual(Array.from(program.move("a", "up", storage, now), (entry) => entry.id), ["a", "c", "b"]);
assert.deepEqual(Array.from(program.move("a", "down", storage, now), (entry) => entry.id), ["c", "a", "b"]);
assert.deepEqual(Array.from(program.move("b", "down", storage, now), (entry) => entry.id), ["c", "a", "b"]);
assert.deepEqual(Array.from(program.move("missing", "up", storage, now), (entry) => entry.id), ["c", "a", "b"]);
assert.deepEqual(Array.from(program.remove("b", storage, now), (entry) => entry.id), ["c", "a"]);
assert.deepEqual(Array.from(program.read(storage, new Date("2026-09-23T10:00:00Z"))), []);
assert.equal(program.clear(storage), true);
assert.deepEqual(Array.from(program.read(storage, now)), []);

const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
assert(app.includes("renderTodayProgram"));
assert(app.includes("addToTodayProgram"));
assert(app.includes("SnakeBonDTodayProgram.add"));
assert(app.includes("SnakeBonDTodayProgram.move"));
assert(app.includes("today-pick-program"));
console.log("Programme du jour v3.1 validé : réorganisation, limites, doublons, retrait et réinitialisation quotidienne conformes.");
