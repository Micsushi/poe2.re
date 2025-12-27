/**
 * Script to fetch waystone modifier data from PoE 2 trade APIs
 * 
 * This is a template script that can be adapted once API endpoints are identified.
 * 
 * Usage:
 *   npx tsx scripts/fetch-waystone-data.ts
 */

interface WaystoneModifier {
  name: string;
  regex: string;
  values: number[];
  ranges: number[][];
  affix: "PREFIX" | "SUFFIX";
}

// poe2db.tw does NOT have a public API, so we'll need to scrape the HTML
const POE2DB_WAYSTONE_URL = "https://poe2db.tw/us/Waystones";

async function fetchWaystoneModifiers(): Promise<WaystoneModifier[]> {
  try {
    // Since poe2db.tw has no public API, we need to scrape the HTML
    console.log("Fetching waystone data from poe2db.tw (web scraping)...");
    return await scrapeWaystoneData();
  } catch (error) {
    console.error("Failed to fetch waystone data:", error);
    return [];
  }
}

function transformApiData(apiData: any): WaystoneModifier[] {
  // TODO: Transform API response to match WaystoneModifier interface
  // This will depend on the actual API response structure
  return [];
}

async function scrapeWaystoneData(): Promise<WaystoneModifier[]> {
  // Web scraping implementation for poe2db.tw
  // Note: This requires parsing HTML, which may break if the site structure changes
  
  try {
    const response = await fetch(POE2DB_WAYSTONE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parse HTML to extract waystone modifier data
    // This is a basic implementation - you may need to adjust based on actual HTML structure
    const modifiers: WaystoneModifier[] = [];
    
    // Example: Look for modifier patterns in the HTML
    // You'll need to inspect the actual HTML structure of poe2db.tw to implement this properly
    // Common patterns might include:
    // - Data attributes (data-modifier, data-name, etc.)
    // - JSON embedded in <script> tags
    // - Table rows with modifier information
    
    // TODO: Implement actual HTML parsing based on poe2db.tw structure
    // You may want to use a library like 'cheerio' or 'jsdom' for better HTML parsing
    
    console.warn("HTML parsing not fully implemented. Manual data entry may be required.");
    return modifiers;
    
  } catch (error) {
    console.error("Error scraping waystone data:", error);
    return [];
  }
}

function generateWaystoneGenFile(modifiers: WaystoneModifier[]): string {
  const header = `export interface WaystoneRegex {
  name: string,
  regex: string,
  values: number[],
  ranges: number[][],
  affix: string,
}
export const waystoneRegex: WaystoneRegex[] = [
`;

  const entries = modifiers.map(mod => {
    const valuesStr = `[${mod.values.join(", ")}]`;
    const rangesStr = `[${mod.ranges.map(r => `[${r.join(", ")}]`).join(", ")}]`;
    
    return `{
  name: "${mod.name}",
  regex: "${mod.regex}",
  values: ${valuesStr},
  ranges: ${rangesStr},
  affix: "${mod.affix}",
},`;
  }).join("\n");

  return header + entries + "\n]";
}

async function main() {
  console.log("Fetching waystone modifier data...");
  
  const modifiers = await fetchWaystoneModifiers();
  
  if (modifiers.length === 0) {
    console.warn("No modifiers found. Please check API endpoints or implement scraping.");
    return;
  }
  
  console.log(`Found ${modifiers.length} modifiers`);
  
  const generatedCode = generateWaystoneGenFile(modifiers);
  
  // Write to file
  const fs = await import("fs/promises");
  await fs.writeFile("src/generated/Waystone.Gen.ts", generatedCode, "utf-8");
  
  console.log("Successfully updated Waystone.Gen.ts");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { fetchWaystoneModifiers, generateWaystoneGenFile };

