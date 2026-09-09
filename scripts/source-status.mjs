export const sourceDefinitions = {
  arte: {
    name: "ARTE",
    scheduleLabel: "Toutes les 12 heures",
    warningAfterHours: 30,
  },
  "epic-games-store": {
    name: "Epic Games Store",
    scheduleLabel: "Toutes les 6 heures",
    warningAfterHours: 18,
  },
  "radio-france": {
    name: "Radio France",
    scheduleLabel: "Toutes les 6 heures",
    warningAfterHours: 18,
  },
};

export function updateSourceStatus(document, provider, checkedAt, itemCount) {
  const definition = sourceDefinitions[provider];
  if (!definition) throw new Error(`Source inconnue : ${provider}`);
  if (Number.isNaN(Date.parse(checkedAt))) throw new Error(`Date de contrôle invalide : ${provider}`);
  if (!Number.isInteger(itemCount) || itemCount < 0) throw new Error(`Nombre d’éléments invalide : ${provider}`);

  const previous = Array.isArray(document?.sources) ? document.sources : [];
  const source = {
    provider,
    ...definition,
    lastSuccessfulCheck: checkedAt,
    itemCount,
  };
  const sources = [...previous.filter((entry) => entry.provider !== provider), source]
    .sort((a, b) => a.provider.localeCompare(b.provider));

  return { version: 1, sources };
}

export function validateSourceStatus(document) {
  if (document?.version !== 1) throw new Error("source-status.json : version invalide");
  if (!Array.isArray(document.sources)) throw new Error("source-status.json : sources absentes");

  const providers = Object.keys(sourceDefinitions);
  for (const provider of providers) {
    const source = document.sources.find((entry) => entry.provider === provider);
    if (!source) throw new Error(`source-status.json : source absente (${provider})`);
    const definition = sourceDefinitions[provider];
    if (source.name !== definition.name) throw new Error(`source-status.json : nom invalide (${provider})`);
    if (source.scheduleLabel !== definition.scheduleLabel) throw new Error(`source-status.json : fréquence invalide (${provider})`);
    if (source.warningAfterHours !== definition.warningAfterHours) throw new Error(`source-status.json : seuil invalide (${provider})`);
    if (Number.isNaN(Date.parse(source.lastSuccessfulCheck))) throw new Error(`source-status.json : date invalide (${provider})`);
    if (!Number.isInteger(source.itemCount) || source.itemCount < 0) throw new Error(`source-status.json : compteur invalide (${provider})`);
  }
  return true;
}
