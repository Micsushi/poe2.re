import {Settings} from "@/app/settings.ts";
import {selectedOptionRegex} from "@/lib/SelectedOptionRegex.ts";

export function generateWaystoneRegex(settings: Settings): string {

  const result = [
    generateTierRegex(settings.waystone.tier),
    generateModifiers(settings.waystone.modifier),
    generateRarity(settings.waystone.rarity),
    generateNumericProperties(settings.waystone.numericProperties, settings.waystone.modifier),
    settings.waystone.resultSettings.customText || null,
  ].filter((e) => e !== null && e !== "");

  if (result.length === 0) return "";
  return result.join(" ").trim();
}


function generateTierRegex(settings: Settings["waystone"]["tier"]): string | null {
  if (settings.max === 0 && settings.min === 0) return null
  if (settings.max !== 0 && settings.min > settings.max) return null;
  if (settings.min < 1 || settings.max < 1) return null;
  if (settings.min <= 1 && settings.max === 16) return null;

  const max = settings.max === 0 ? 16 : settings.max;
  const min = settings.min;

  const numbersUnder10 = range(min, Math.min(10, max + 1));
  const numbersOver10 = range(Math.max(10, min), max + 1);

  const regexUnder10 = numbersUnder10.length <= 1 ? `${numbersUnder10.join("")}` :
    numbersUnder10.length > 2 ? `[${numbersUnder10[0]}-${numbersUnder10[numbersUnder10.length - 1]}]` : `[${numbersUnder10.join("")}]`;

  const regexOver10 = numbersOver10.length <= 1 ? `${numbersOver10.join("")}` : `1[${numbersOver10.map((e) => e.toString()[1]).join("")}]`;

  const under10 = regexUnder10 === "" ? "" : `r ${regexUnder10}\\)`
  const over10 = regexOver10 === "" ? "" : `${regexOver10}\\)`
  const result = [under10, over10].filter((e) => e !== "").join("|");
  return result === "" ? "" : `"${result}"`
}

function generateModifiers(settings: Settings["waystone"]["modifier"]): string | null {
  // Excluded modifiers (combined prefixes and suffixes, exclusions)
  const excludedMods = settings.excludedModifiers
    .filter((e) => e.isSelected)
    .map((e) => selectedOptionRegex(e, settings.round10, settings.over100));

  const excludedModsWithType = settings.excludeSelectType === "any"
    ? excludedMods.join("|")
    : excludedMods.map((e) => `"${e}"`).join(" ");

  // Wanted modifiers (positive matches, no !)
  const wantedMods = settings.wantedModifiers
    .filter((e) => e.isSelected)
    .map((e) => selectedOptionRegex(e, settings.round10, settings.over100));

  const wantedModsWithType = settings.wantedModifierSelectType === "any"
    ? `"${wantedMods.join("|")}"`
    : wantedMods.map((e) => `"${e}"`).join(" ");

  return [
    excludedMods.length > 0 ? `"!${excludedModsWithType}"` : null,
    wantedMods.length > 0 ? wantedModsWithType : null,
  ].filter((e) => e !== null).join(" ");
}

function generateRarity(settings: Settings["waystone"]["rarity"]): string | null {
  if (settings.uncorrupted && settings.corrupted) return null;
  if (settings.corrupted) return "corr";
  if (settings.uncorrupted) return "!corr";
  return null;
}


function generateNumericProperties(
  settings: Settings["waystone"]["numericProperties"],
  modifierSettings: Settings["waystone"]["modifier"]
): string | null {
  // Group properties by their minimum value to combine patterns with same number
  const valueGroups = new Map<string, { identifiers: string[], suffix: string }>();
  
  // Pack size: "k si.*: \+"
  if (settings.minPackSize > 0) {
    const numPattern = generateWaystoneNumberPattern(settings.minPackSize, modifierSettings.over100);
    if (numPattern) {
      const key = `\\+${numPattern}`;
      if (!valueGroups.has(key)) {
        valueGroups.set(key, { identifiers: [], suffix: key });
      }
      valueGroups.get(key)!.identifiers.push("k si");
    }
  }

  // Magic Monsters: "c m.*: \+"
  if (settings.minMagicMonsters > 0) {
    const numPattern = generateWaystoneNumberPattern(settings.minMagicMonsters, modifierSettings.over100);
    if (numPattern) {
      const key = `\\+${numPattern}`;
      if (!valueGroups.has(key)) {
        valueGroups.set(key, { identifiers: [], suffix: key });
      }
      valueGroups.get(key)!.identifiers.push("c m");
    }
  }

  // Item Rarity: "y.*: \+" (use "m r" when combining with others to avoid ambiguity)
  if (settings.minItemRarity > 0) {
    const numPattern = generateWaystoneNumberPattern(settings.minItemRarity, modifierSettings.over100);
    if (numPattern) {
      const key = `\\+${numPattern}`;
      if (!valueGroups.has(key)) {
        valueGroups.set(key, { identifiers: [], suffix: key });
      }
      // Use "m r" (from "ITEM RARITY") when combining, "y" when alone
      valueGroups.get(key)!.identifiers.push("m r");
    }
  }

  // Rare Monsters: "e m.*: \+"
  if (settings.minRareMonsters > 0) {
    const numPattern = generateWaystoneNumberPattern(settings.minRareMonsters, modifierSettings.over100);
    if (numPattern) {
      const key = `\\+${numPattern}`;
      if (!valueGroups.has(key)) {
        valueGroups.set(key, { identifiers: [], suffix: key });
      }
      valueGroups.get(key)!.identifiers.push("e m");
    }
  }

  // Revives Available: "s av.*: " (no + sign)
  if (settings.minRevivesAvailable > 0) {
    const numPattern = generateWaystoneNumberPatternNoPercent(settings.minRevivesAvailable);
    if (numPattern) {
      const key = ` ${numPattern}`;
      if (!valueGroups.has(key)) {
        valueGroups.set(key, { identifiers: [], suffix: key });
      }
      valueGroups.get(key)!.identifiers.push("s av");
    }
  }

  // Waystone Drop Chance: "e dr.*: \+"
  if (settings.minWaystoneDropChance > 0) {
    const numPattern = generateWaystoneNumberPattern(settings.minWaystoneDropChance, modifierSettings.over100);
    if (numPattern) {
      const key = `\\+${numPattern}`;
      if (!valueGroups.has(key)) {
        valueGroups.set(key, { identifiers: [], suffix: key });
      }
      valueGroups.get(key)!.identifiers.push("e dr");
    }
  }

  if (valueGroups.size === 0) return null;

  // Build patterns: combine identifiers with same number pattern
  const combinedPatterns: string[] = [];
  
  // For "all" mode, we can't combine identifiers with | because that means "any", not "all"
  // So we need separate patterns for each property
  if (settings.matchType === "all") {
    // Build individual patterns for each property
    for (const [_, group] of valueGroups) {
      for (const identifier of group.identifiers) {
        // For Item Rarity alone, use "y: " (exact match, no .*) since it's unique
        if (identifier === "m r") {
          combinedPatterns.push(`y: ${group.suffix}`);
        } else {
          // Other properties need .* for text between identifier and ": +"
          combinedPatterns.push(`${identifier}.*: ${group.suffix}`);
        }
      }
    }
  } else {
    // For "any" mode, we can combine identifiers with same number pattern
    for (const [_, group] of valueGroups) {
      if (group.identifiers.length === 1) {
        // Single identifier
        const identifier = group.identifiers[0];
        // For Item Rarity alone, use "y: " (exact match, no .*) since it's unique
        if (identifier === "m r") {
          combinedPatterns.push(`y: ${group.suffix}`);
        } else {
          // Other properties need .* for text between identifier and ": +"
          combinedPatterns.push(`${identifier}.*: ${group.suffix}`);
        }
      } else {
        // Multiple identifiers with same number - combine them: "(c m|e m).*: \+pattern"
        // Use "m r" for Item Rarity when combining to avoid ambiguity (can't use "y.*" as it's too vague)
        const identifiersGroup = `(${group.identifiers.join("|")})`;
        combinedPatterns.push(`${identifiersGroup}.*: ${group.suffix}`);
      }
    }
  }

  if (combinedPatterns.length === 0) return null;
  if (combinedPatterns.length === 1) return `"${combinedPatterns[0]}"`;
  
  // Use matchType to determine if patterns should be combined with | (any) or no spaces (all)
  if (settings.matchType === "all") {
    return combinedPatterns.map((e) => `"${e}"`).join("");
  } else {
    return `"${combinedPatterns.join("|")}"`;
  }
}

// Generates optimized number pattern for waystone tooltip format
function generateWaystoneNumberPattern(minValue: number, _over100: boolean): string {
  if (minValue <= 0) return "";
  
  // For values >= 100, use pattern like (1\d{2,}|\d{4,})
  if (minValue >= 100) {
    return `(1\\d{2,}|\\d{4,})`;
  }
  
  // For values 60-99
  if (minValue >= 60) {
    const firstDigit = Math.floor(minValue / 10);
    const secondDigit = minValue % 10;
    if (secondDigit === 0) {
      return `([${firstDigit}-9]\\d|\\d{3,})`;
    }
    if (firstDigit === 9) {
      return `(9[${secondDigit}-9]|\\d{3,})`;
    }
    return `([${firstDigit}][${secondDigit}-9]|[${firstDigit + 1}-9]\\d|\\d{3,})`;
  }
  
  // For values 10-59
  if (minValue >= 10) {
    const firstDigit = Math.floor(minValue / 10);
    const secondDigit = minValue % 10;
    if (secondDigit === 0) {
      return `([${firstDigit}-9]\\d|\\d{3,})`;
    }
    if (firstDigit === 9) {
      return `(9[${secondDigit}-9]|\\d{3,})`;
    }
    return `([${firstDigit}][${secondDigit}-9]|[${firstDigit + 1}-9]\\d|\\d{3,})`;
  }
  
  // For values 1-9
  return `([${minValue}-9]|\\d{2,})`;
}

// Generates number pattern for values without % sign (like revives available)
function generateWaystoneNumberPatternNoPercent(minValue: number): string {
  if (minValue <= 0) return "";
  
  // For values >= 100
  if (minValue >= 100) {
    return `(1\\d{2,}|\\d{4,})`;
  }
  
  // For values 10-99
  if (minValue >= 10) {
    const firstDigit = Math.floor(minValue / 10);
    const secondDigit = minValue % 10;
    if (secondDigit === 0) {
      return `([${firstDigit}-9]\\d|\\d{3,})`;
    }
    if (firstDigit === 9) {
      return `(9[${secondDigit}-9]|\\d{3,})`;
    }
    return `([${firstDigit}][${secondDigit}-9]|[${firstDigit + 1}-9]\\d|\\d{3,})`;
  }
  
  // For values 1-9
  return `([${minValue}-9]|\\d{2,})`;
}

function range(start: number, end: number): number[] {
  if (end - start <= 0) return [];
  return [...Array((end - start)).keys()].map(i => i + start);
}

