import {cn} from "@/lib/utils.ts";

export interface SelectOption {
  name: string
  value: number | null
  isSelected: boolean
  ranges: number[][]
  regex: string
}

interface SelectElementProps {
  name: string
  ranges: number[][]
  current: SelectOption
  selected: SelectOption[]
  setSelected: (options: SelectOption[]) => void
  compactView?: boolean
}

// Checks if a part starts with a stat pattern (#%, ##%, +##%, etc.)
function hasStatPattern(part: string): boolean {
  return /^([+#]?##?%?|##|#|\d+%)\s/.test(part.trim());
}

export function SelectElement(props: SelectElementProps) {
  const {name, ranges: _ranges, current, selected, setSelected, compactView = false} = props;
  
  // Split by | to get individual parts
  const parts = name.split("|").map(part => part.trim());
  
  // Separate stat parts (with #%, ##%, etc.) from main description parts
  const statParts: string[] = [];
  const mainParts: string[] = [];
  
  parts.forEach(part => {
    if (hasStatPattern(part)) {
      statParts.push(part);
    } else {
      mainParts.push(part);
    }
  });

  // Format stat parts for display - replace ## with # for display
  const formattedStatParts = statParts.map(part => {
    return part.replace(/##/g, "#");
  });

  return (
    <div 
      className={cn(
        "flex w-full max-w items-center space-x-2 p-2 rounded-md transition-colors",
        current.isSelected 
          ? "bg-muted/70 border border-gray-600" 
          : "hover:bg-muted/30"
      )}
    >
      {/* Removed input box - user only cares if mod exists, not the specific value */}
      <div className="cursor-pointer w-full" onClick={() =>
        setSelected(selected
          .filter((e) => e.name !== name)
          .concat({...current, isSelected: !current.isSelected}))
      }>
        {/* If there are main parts (non-stat), show them first, then stat parts in brackets */}
        {mainParts.length > 0 ? (
          <>
            <span>{mainParts.join(" • ")}</span>
            {!compactView && formattedStatParts.length > 0 && (
              <span className="text-sidebar-foreground/50"> ({formattedStatParts.join(" • ")})</span>
            )}
          </>
        ) : (
          /* If all parts are stat parts, show first normally, rest in brackets (grey) */
          formattedStatParts.length > 0 && (
            <>
              <span>{formattedStatParts[0]}</span>
              {!compactView && formattedStatParts.length > 1 && (
                <span className="text-sidebar-foreground/50"> ({formattedStatParts.slice(1).join(" • ")})</span>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}

export interface SelectListProps {
  id: string
  options: SelectOption[]
  selected: SelectOption[]
  setSelected: (options: SelectOption[]) => void
  compactView?: boolean
}

export function SelectList(props: SelectListProps
) {
  const {id, options, selected, setSelected, compactView = false} = props;

  return (
    <div key={id}>
      {options.map((mod) => {
        return (
          <div key={mod.name}>
            <SelectElement
              current={selected.find((e) => e.name === mod.name) as SelectOption || mod}
              ranges={mod.ranges}
              name={mod.name}
              selected={selected}
              setSelected={setSelected}
              compactView={compactView}
            />
          </div>
        )
      })}
    </div>
  )
}
