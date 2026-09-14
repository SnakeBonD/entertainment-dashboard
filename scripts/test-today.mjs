import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const context={window:{}}; vm.runInNewContext(fs.readFileSync(new URL("../js/today.js",import.meta.url),"utf8"),context);
const now=new Date("2026-09-13T00:00:00Z");
const items=context.window.SnakeBonDToday.build({now,catalogue:{items:[
 {id:"tracked",title:"Suivi",platform:"ARTE",verified:true,addedDate:"2026-09-01",expiryDate:"2026-09-14",url:"https://arte.tv"},
 {id:"epic",title:"Jeu",platform:"Epic Games Store",provider:"epic-games-store",verified:true,addedDate:"2026-09-12",expiryDate:"2026-09-20",url:"https://epicgames.com"},
 {id:"old",title:"Ancien",platform:"ARTE",verified:true,addedDate:"2026-01-01",expiryDate:"2027-01-01"}
]},podcasts:{items:[{id:"pod",title:"Podcast",publishedAt:"2026-09-12",url:"https://radiofrance.fr"}]},isTracked:id=>id==="tracked"});
assert.deepEqual(Array.from(items,x=>x.id),["tracked","epic","pod"]); assert.equal(items[0].group,"lastChance");
assert.deepEqual(Array.from(context.window.SnakeBonDToday.filter(items,"tracked"),x=>x.id),["tracked"]);
assert.deepEqual(Array.from(context.window.SnakeBonDToday.filter(items,"epic"),x=>x.id),["epic"]);
assert.deepEqual(Array.from(context.window.SnakeBonDToday.filter(items,"podcast"),x=>x.id),["pod"]);
assert.equal(context.window.SnakeBonDToday.filter(items,"new").length,0);
const memory=new Map(); const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
assert.deepEqual(Array.from(context.window.SnakeBonDToday.dismiss("epic",storage,now)),["epic"]);
assert.deepEqual(Array.from(context.window.SnakeBonDToday.readDismissed(storage,now)),["epic"]);
assert.deepEqual(Array.from(context.window.SnakeBonDToday.visible(items,["epic"]),x=>x.id),["tracked","pod"]);
assert.deepEqual(Array.from(context.window.SnakeBonDToday.readDismissed(storage,new Date("2026-09-14T12:00:00Z"))),[]);
context.window.SnakeBonDToday.clearDismissed(storage); assert.equal(memory.size,0);
const app=fs.readFileSync(new URL("../js/app.js",import.meta.url),"utf8");
assert(app.includes("today-watchlist")); assert(app.includes("SnakeBonDWatchlist?.set(target,listSelect.value)")); assert(app.includes("SnakeBonDWatchlist?.remove(item.id)"));
console.log("Espace Aujourd’hui v2.3 validé : filtres, masquage quotidien et gestion de la liste personnelle conformes.");
