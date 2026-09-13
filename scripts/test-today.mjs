import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const context={window:{}}; vm.runInNewContext(fs.readFileSync(new URL("../js/today.js",import.meta.url),"utf8"),context);
const now=new Date("2026-09-13T00:00:00Z");
const items=context.window.SnakeBonDToday.build({now,catalogue:{items:[
 {id:"tracked",title:"Suivi",platform:"ARTE",verified:true,addedDate:"2026-09-01",expiryDate:"2026-09-14",url:"https://arte.tv"},
 {id:"epic",title:"Jeu",platform:"Epic Games Store",provider:"epic-games",verified:true,addedDate:"2026-09-12",expiryDate:"2026-09-20",url:"https://epicgames.com"},
 {id:"old",title:"Ancien",platform:"ARTE",verified:true,addedDate:"2026-01-01",expiryDate:"2027-01-01"}
]},podcasts:{items:[{id:"pod",title:"Podcast",publishedAt:"2026-09-12",url:"https://radiofrance.fr"}]},isTracked:id=>id==="tracked"});
assert.deepEqual(Array.from(items,x=>x.id),["tracked","epic","pod"]); assert.equal(items[0].group,"lastChance");
console.log("Espace Aujourd’hui v2.0 validé : priorités, nouveautés, échéances, Epic et podcasts conformes.");
