import {Header} from "@/components/header/Header.tsx";
import {Result} from "@/components/result/Result.tsx";
import {defaultSettings, Settings} from "@/app/settings.ts";
import {useEffect, useState} from "react";
import {loadSettings, saveSettings, selectedProfile, setSelectedProfile} from "@/lib/localStorage.ts";
import ProfileSelector from "@/components/profile/ProfileSelector.tsx";
import {generateWaystoneRegex} from "@/pages/waystone/WaystoneResult.ts";
import {Input} from "@/components/ui/input.tsx";
import {Checked} from "@/components/checked/Checked.tsx";
import {SelectList, SelectOption} from "@/components/selectList/SelectList.tsx";
import {waystoneRegex} from "@/generated/Waystone.Gen.ts";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";

export function Waystone() {
  const initialProfile = selectedProfile();
  const [currentProfile, setCurrentProfile] = useState<string>(initialProfile);
  const globalSettings = loadSettings(initialProfile)
  const [settings, setSettings] = useState<Settings["waystone"]>(globalSettings.waystone);
  const [result, setResult] = useState("");

  // Helper function to check if a modifier should be in the "wanted" list
  // Only include modifiers that START with these patterns (primary stat)
  // Exclude modifiers where these are secondary stats (like "#% increased Magic Monsters" as secondary)
  // Also exclude specific bad modifiers that start with "#% increased number of Rare Monsters"
  const isWantedModifier = (name: string): boolean => {
    // Exclude bad modifiers that start with "#% increased number of Rare Monsters" but have bad secondary effects
    if (name.includes("Monsters are Armoured") ||
        name.includes("Monsters Break Armour equal to ##% of Physical Damage dealt") ||
        name.includes("Monsters take ##% reduced Extra Damage from Critical Hits")) {
      return false;
    }
    
    // Check if it starts with "#% increased number of Rare Monsters"
    if (name.startsWith("#% increased number of Rare Monsters")) {
      return true;
    }
    // Check if it starts with "Area contains ## additional packs"
    if (name.startsWith("Area contains ## additional packs")) {
      return true;
    }
    // Check if it contains "Rare Monsters have # additional Modifier" (this is always a suffix, so check if it's the primary part)
    // This appears as a suffix, so we check if the name contains it (it's the second part in the name)
    if (name.includes("Rare Monsters have # additional Modifier")) {
      // Make sure it's not just "#% increased Magic Monsters" with this as secondary
      if (!name.startsWith("#% increased Magic Monsters")) {
        return true;
      }
    }
    return false;
  };

  // Separate wanted modifiers from excluded ones, and combine prefixes/suffixes
  const allModifiers = waystoneRegex.map((mod) => ({
    name: mod.name,
    isWanted: isWantedModifier(mod.name),
    affix: mod.affix,
    ranges: mod.ranges,
    regex: mod.regex,
  }));

  // Helper function to normalize names for sorting
  // Items starting with special characters (#, +, etc.) should be sorted at the top
  const normalizeForSort = (name: string): string => {
    // Get the first part before the | separator
    const firstPart = name.split('|')[0].trim();
    
    // Check if it starts with special characters (#, +, %)
    // This regex checks if the string starts with +, #, or %
    const startsWithSpecial = /^[+#%]/.test(firstPart);
    
    if (startsWithSpecial) {
      // For items starting with special chars, remove them and use the text after for sorting
      // Prefix with "0" to ensure they sort before regular items (0 comes before 1 in ASCII)
      const cleaned = firstPart.replace(/^[+]?##?%?\s*/i, '').trim().toLowerCase();
      return `0_${cleaned}`;
    } else {
      // For regular items, use as-is but prefix with "1" to sort after special char items
      return `1_${firstPart.toLowerCase()}`;
    }
  };

  // Wanted modifiers (sorted alphabetically, case-insensitive, special chars first)
  const wantedModifiers: SelectOption[] = allModifiers
    .filter((e) => e.isWanted)
    .sort((a, b) => {
      const aNorm = normalizeForSort(a.name);
      const bNorm = normalizeForSort(b.name);
      return aNorm.localeCompare(bNorm, undefined, { sensitivity: 'base' });
    })
    .map((mod) => ({
      name: mod.name,
      isSelected: settings.modifier.wantedModifiers
        .some((e) => e.name === mod.name && e.isSelected),
      value: settings.modifier.wantedModifiers
        .find((e) => e.name === mod.name)?.value || null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  // Split wanted modifiers into two columns
  const wantedMidPoint = Math.ceil(wantedModifiers.length / 2);
  const wantedModifiersLeft = wantedModifiers.slice(0, wantedMidPoint);
  const wantedModifiersRight = wantedModifiers.slice(wantedMidPoint);

  // Excluded modifiers (combined prefixes and suffixes, sorted alphabetically, case-insensitive, special chars first)
  const excludedModifiers: SelectOption[] = allModifiers
    .filter((e) => !e.isWanted)
    .sort((a, b) => {
      const aNorm = normalizeForSort(a.name);
      const bNorm = normalizeForSort(b.name);
      return aNorm.localeCompare(bNorm, undefined, { sensitivity: 'base' });
    })
    .map((mod) => ({
      name: mod.name,
      isSelected: settings.modifier.excludedModifiers
        .some((e) => e.name === mod.name && e.isSelected),
      value: settings.modifier.excludedModifiers
        .find((e) => e.name === mod.name)?.value || null,
      ranges: mod.ranges,
      regex: mod.regex,
    }));

  // Split excluded modifiers into two columns
  const midPoint = Math.ceil(excludedModifiers.length / 2);
  const excludedModifiersLeft = excludedModifiers.slice(0, midPoint);
  const excludedModifiersRight = excludedModifiers.slice(midPoint);

  useEffect(() => {
    const base = loadSettings(currentProfile);
    const settingsResult = {...base, waystone: {...settings}, name: currentProfile};
    saveSettings(settingsResult);
    setResult(generateWaystoneRegex(settingsResult));
  }, [settings]);

  useEffect(() => {
    const gs = loadSettings(currentProfile);
    setSettings(gs.waystone);
    setResult(generateWaystoneRegex(gs));
    setSelectedProfile(currentProfile);
  }, [currentProfile]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Header name="Waystone Regex"></Header>
        <div className="page-header-profile pr-4">
          <ProfileSelector currentProfile={currentProfile} setCurrentProfile={setCurrentProfile} />
        </div>
      </div>
      <div className="flex bg-muted grow-0 flex-1 flex-col gap-2 ">
        <Result
          result={result}
          reset={() => setSettings(defaultSettings.waystone)}
          customText={settings.resultSettings.customText}
          autoCopy={settings.resultSettings.autoCopy}
          setCustomText={(text) => {
            setSettings({
              ...settings, resultSettings: {...settings.resultSettings, customText: text,}
            })
          }}
          setAutoCopy={(enable) => {
            setSettings({
              ...settings, resultSettings: {...settings.resultSettings, autoCopy: enable,}
            })
          }}
        />
      </div>
      <div className="flex grow bg-muted/30 flex-1 flex-col gap-2 p-4">
        <div>
          <p className="text-base font-semibold text-blue-400 pb-2">Global settings</p>
          <div className="grid lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-1 gap-3 pl-4">
            <div>
              <Checked id="compact-view" text="Compact view (hide secondary stats)"
                       checked={settings.compactView}
                       onChange={(b) => setSettings({
                         ...settings, compactView: b
                       })}
              />
              <Checked id="round-10" text="Round down to nearest 10 (saves a lot of space)"
                       checked={settings.modifier.round10}
                       onChange={(b) => setSettings({
                         ...settings, modifier: {...settings.modifier, round10: b}
                       })}
              />
              <Checked id="over-100" text="Match numbers over 100% (takes more space)"
                       checked={settings.modifier.over100}
                       onChange={(b) => setSettings({
                         ...settings, modifier: {...settings.modifier, over100: b}
                       })}
              />
            </div>
            <div className="grid lg:grid-cols-2">
              <div>
                <p className="pb-2">Minimum tier:</p>
                <Input type="number" min="1" max="16" placeholder="Min tier" className="pb-2 mb-2 w-40"
                       value={settings.tier.min}
                       onChange={(b) => {
                         if (Number(b.target.value) <= settings.tier.max) {
                           setSettings({
                             ...settings, tier: {...settings.tier, min: Math.min(Number(b.target.value), 16) || 0}
                           })
                         }
                       }}
                />
              </div>
              <div>
                <p className="pb-2">Maximum tier:</p>
                <Input type="number" min="1" max="16" placeholder="Max tier" className="pb-2 mb-2 w-40"
                       value={settings.tier.max}
                       onChange={(b) => {
                         if (Number(b.target.value) >= settings.tier.min) {
                           setSettings({
                             ...settings, tier: {...settings.tier, max: Math.min(Number(b.target.value), 16) || 0}
                           })
                         }
                       }}
                />
              </div>
            </div>
            <div className="border border-gray-600 rounded-md p-3 bg-muted/50">
              <Checked id="rarity-corrupted" text="Corrupted Waystones"
                       checked={settings.rarity.corrupted}
                       onChange={(b) => setSettings({
                         ...settings, rarity: {...settings.rarity, corrupted: b}
                       })}
              />
              <Checked id="rarity-uncorrupted" text="Uncorrupted Waystones"
                       checked={settings.rarity.uncorrupted}
                       onChange={(b) => setSettings({
                         ...settings, rarity: {...settings.rarity, uncorrupted: b}
                       })}
              />
            </div>
          </div>
        </div>
        <div className="pt-2">
          <div>
            <p className="text-base font-semibold text-blue-400 pb-1">
              Numeric Property Filters
            </p>
            <p className="text-xs text-sidebar-foreground/50 pb-2">
              Filter by minimum values (0 = disabled)
            </p>
            <div className="pb-2 border border-gray-600 rounded-md p-3 bg-muted/50">
              <RadioGroup value={settings.numericProperties.matchType} onValueChange={(v) => {
                setSettings({
                  ...settings, numericProperties: {...settings.numericProperties, matchType: v}
                })
              }}>
                <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="any" id="numeric-any"/>
                    <Label htmlFor="numeric-any"><span className="text-lg cursor-pointer">Match when <span className="font-semibold">any</span> property matches</span></Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="all" id="numeric-all"/>
                    <Label htmlFor="numeric-all"><span className="text-lg cursor-pointer">Match only when <span className="font-semibold">all</span> properties match</span></Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4 mt-2">
              <div>
                <Label htmlFor="min-pack-size" className="pb-2 font-bold">Min Pack Size (%):</Label>
                <Input
                  id="min-pack-size"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-32 h-8"
                  value={settings.numericProperties.minPackSize}
                  onChange={(e) => setSettings({
                    ...settings,
                    numericProperties: {
                      ...settings.numericProperties,
                      minPackSize: Math.max(0, Number(e.target.value) || 0)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="min-magic-monsters" className="pb-2 font-bold">Min Magic Monsters (%):</Label>
                <Input
                  id="min-magic-monsters"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-32 h-8"
                  value={settings.numericProperties.minMagicMonsters}
                  onChange={(e) => setSettings({
                    ...settings,
                    numericProperties: {
                      ...settings.numericProperties,
                      minMagicMonsters: Math.max(0, Number(e.target.value) || 0)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="min-item-rarity" className="pb-2 font-bold">Min Item Rarity (%):</Label>
                <Input
                  id="min-item-rarity"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-32 h-8"
                  value={settings.numericProperties.minItemRarity}
                  onChange={(e) => setSettings({
                    ...settings,
                    numericProperties: {
                      ...settings.numericProperties,
                      minItemRarity: Math.max(0, Number(e.target.value) || 0)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="min-rare-monsters" className="pb-2 font-bold">Min Rare Monsters (%):</Label>
                <Input
                  id="min-rare-monsters"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-32 h-8"
                  value={settings.numericProperties.minRareMonsters}
                  onChange={(e) => setSettings({
                    ...settings,
                    numericProperties: {
                      ...settings.numericProperties,
                      minRareMonsters: Math.max(0, Number(e.target.value) || 0)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="min-revives-available" className="pb-2 font-bold">Min Revives Available:</Label>
                <Input
                  id="min-revives-available"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-32 h-8"
                  value={settings.numericProperties.minRevivesAvailable}
                  onChange={(e) => setSettings({
                    ...settings,
                    numericProperties: {
                      ...settings.numericProperties,
                      minRevivesAvailable: Math.max(0, Number(e.target.value) || 0)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="min-waystone-drop-chance" className="pb-2 font-bold">Min Waystone Drop Chance (%):</Label>
                <Input
                  id="min-waystone-drop-chance"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-32 h-8"
                  value={settings.numericProperties.minWaystoneDropChance}
                  onChange={(e) => setSettings({
                    ...settings,
                    numericProperties: {
                      ...settings.numericProperties,
                      minWaystoneDropChance: Math.max(0, Number(e.target.value) || 0)
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-2">
          <p className="text-base font-semibold text-blue-400 pb-2">
            GOOD Modifiers (will highlight maps with these modifiers)
          </p>
          <p className="text-xs text-sidebar-foreground/50 pb-2">
            Select modifiers you want to find (Rare Monsters, Magic Monsters, Additional Packs, etc.)
          </p>
          <div className="pb-3 border border-gray-600 rounded-md p-3 bg-muted/50">
            <RadioGroup value={settings.modifier.wantedModifierSelectType} onValueChange={(v) => {
              setSettings({
                ...settings, modifier: {...settings.modifier, wantedModifierSelectType: v}
              })
            }}>
              <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="wanted-any"/>
                  <Label htmlFor="wanted-any"><span className="text-lg cursor-pointer">Include when <span className="font-semibold">ANY</span> selected mod is found</span></Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="wanted-all"/>
                  <Label htmlFor="wanted-all"><span className="text-lg cursor-pointer">Include only when <span className="font-semibold">ALL</span> selected mods are found</span></Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-4">
            <SelectList
              id="wanted-modifiers-left"
              options={wantedModifiersLeft}
              selected={settings.modifier.wantedModifiers}
              setSelected={(modifiers) => {
                setSettings({
                  ...settings,
                  modifier: {...settings.modifier, wantedModifiers: modifiers}
                })
              }}
              compactView={settings.compactView}
            />
            <SelectList
              id="wanted-modifiers-right"
              options={wantedModifiersRight}
              selected={settings.modifier.wantedModifiers}
              setSelected={(modifiers) => {
                setSettings({
                  ...settings,
                  modifier: {...settings.modifier, wantedModifiers: modifiers}
                })
              }}
              compactView={settings.compactView}
            />
          </div>
        </div>
        <div className="pt-2">
          <p className="text-base font-semibold text-blue-400 pb-2">
            BAD Modifiers (will NOT highlight maps with these modifiers)
          </p>
          <div className="pb-3 border border-gray-600 rounded-md p-3 bg-muted/50">
            <RadioGroup value={settings.modifier.excludeSelectType} onValueChange={(v) => {
              setSettings({
                ...settings, modifier: {...settings.modifier, excludeSelectType: v}
              })
            }}>
              <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="any" id="exclude-any"/>
                  <Label htmlFor="exclude-any"><span className="text-lg cursor-pointer">Exclude when <span className="font-semibold">ANY</span> selected mod is found</span></Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="exclude-all"/>
                  <Label htmlFor="exclude-all"><span className="text-lg cursor-pointer">Exclude only when <span className="font-semibold">ALL</span> selected mods are found</span></Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-4">
            <SelectList
              id="excluded-modifiers-left"
              options={excludedModifiersLeft}
              selected={settings.modifier.excludedModifiers}
              setSelected={(modifiers) => {
                setSettings({
                  ...settings,
                  modifier: {...settings.modifier, excludedModifiers: modifiers}
                })
              }}
              compactView={settings.compactView}
            />
            <SelectList
              id="excluded-modifiers-right"
              options={excludedModifiersRight}
              selected={settings.modifier.excludedModifiers}
              setSelected={(modifiers) => {
                setSettings({
                  ...settings,
                  modifier: {...settings.modifier, excludedModifiers: modifiers}
                })
              }}
              compactView={settings.compactView}
            />
          </div>
        </div>
      </div>
    </>
  )
}
