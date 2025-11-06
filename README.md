# GEDCOM Shell Navigator

An interactive shell-like navigator for GEDCOM genealogy files. Navigate your family tree using familiar command-line interface commands.

## Installation & Running

0. [Get Node.js®](https://nodejs.org/en/download)

1. Install dependencies:
```bash
npm install
```

2. Run the navigator:
```bash
node src/index.js samples/arrestedDevelopment.ged
```

3. Navigate the family tree
```
[Root]> cd George Bluth
Navigated to George Bluth Sr.

[@I1@ George Bluth Sr.]> tree
George Bluth Sr. (1 JAN 1937-?)
├── George Oscar Bluth II (15 JUN 1965-?)
│   └── Steve Holt (25 JUN 1987-?)
├── Michael Bluth (14 DEC 1967-?)
│   └── George Michael Bluth (15 FEB 1990-?)
├── Lindsay Bluth Fünke (8 JUL 1968-?)
│   └── Mae Fünke (23 DEC 1988-?)
├── Byron Bluth (3 MAR 1973-?)
└── Annyong Bluth (5 FEB 1986-?)

[@I1@ George Bluth Sr.]> show
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Individual: @I1@
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:     George Bluth Sr.
Sex:      Male
Born:     1 JAN 1937 in Newport Beach, California, USA

Families as Spouse:
  @F1@ married to Lucille Austero Bluth
    Marriage: 14 FEB 1960 in Newport Beach, California, USA
    Children:
      - @I4@ George Oscar Bluth II (15 JUN 1965-?)
      - @I5@ Michael Bluth (14 DEC 1967-?)
      - @I6@ Lindsay Bluth Fünke (8 JUL 1968-?)
      - @I7@ Byron Bluth (3 MAR 1973-?)
      - @I14@ Annyong Bluth (5 FEB 1986-?)
```

## Essential Commands

### Getting Started
- `help` - Show all available commands
- `stats` - See overview of the family tree
- `ls` - List all individuals

### Navigation
- `find <name>` - Search for someone (e.g., `find John`)
- `cd <id>` - Navigate to person (e.g., `cd @I0@`)
- `cd "<name>"` - Navigate by name (e.g., `cd "John Doe"`)
- `show` - Show detailed info about current person
- `cd ..` - Go back to previous location

### Exploring Relationships
Once you've navigated to a person:
- `parents` - See their parents
- `children` - See their children
- `siblings` - See their siblings
- `spouses` - See their spouse(s)
- `tree` - Visualize family tree
- `tree 5` - Visualize deeper (5 generations)
- `ancestors 5` - Visualize the parent tree

### Quick Examples

**Example 1: Find and explore a person**
```
[Root]> find John
[Root]> cd @I0@
[@I0@ John...]> show
[@I0@ John...]> parents
[@I0@ John...]> tree
```

**Example 2: Navigate through relationships**
```
[Root]> cd @I2@
[@I2@ John Sr...]> children
[@I2@ John Sr...]> cd @I0@
[@I0@ John...]> siblings
[@I0@ John...]> spouses
```

## Keyboard Shortcuts

- **↑/↓** - Browse command history
- **Ctrl+C** - Clear current line
- **Ctrl+D** - Exit

## Tips

1. **IDs are permanent** - Use `cd @I0@` for reliable navigation
2. **Names can be ambiguous** - If multiple people have the same name, use their ID
3. **Use history** - Press ↑ to repeat previous commands
4. **Explore relationships** - The relationship commands (`parents`, `children`, etc.) are the fastest way to navigate
5. **Tree view** - Use `tree` to get oriented in the family structure

## Common Workflows

### Workflow 1: Research a person
```bash
find <name>      # Find the person
cd <id>          # Navigate to them
show             # See full details
parents          # Check parents
children         # Check children
tree 3           # See context
```

### Workflow 2: Explore a branch
```bash
cd <ancestor>    # Go to starting point
tree 5           # See descendants
cd <child-id>    # Navigate down
show             # Examine details
```

### Workflow 3: Find connections
```bash
cd <person1>     # Start with first person
parents          # See parents
cd <parent-id>   # Go to parent
children         # See all children
siblings         # Find siblings of original person
```

## Fictional Calendar Support

The GEDCOM Shell Navigator supports fictional calendar systems, making it perfect for exploring genealogies from fictional universes like Dune, Star Wars, or custom worlds!

### Supported Date Formats

The parser now recognizes various date formats:
- **Standard GEDCOM**: `20 JUN 1979`
- **Fictional calendars**: `ABT 10191 AG`, `9900 BG`
- **Date modifiers**: `ABT` (about), `BEF` (before), `AFT` (after), `EST` (estimated)

Any two-letter calendar suffix is recognized (AG, BG, SC, SD, etc.).

### Example: Dune Universe (AG Calendar)

The included `samples/houseAtreides.ged` uses the AG (After Guild) calendar:

```
[Root]> cd Paul Atreides
Navigated to Paul Atreides

[@I5@ Paul Atreides]> show
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Individual: @I5@
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:     Paul Atreides
Sex:      Male
Born:     ABT 10191 AG

[@I5@ Paul Atreides]> stats
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Genealogy Tree Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Individuals: 27
Total Families:    10
Total Notes:       0

Gender Distribution:
  Male:    19
  Female:  8
  Unknown: 0

Calendar Systems Detected:
  AG

Date Ranges by Calendar:
  AG:
    Births: 9900 - 10350
    Deaths: 9950 - 10191
```

### Setting a Fictional Date Context

For living characters in fictional universes, you need to set a "current date" to calculate ages:

```
# Set the current date in the Dune universe to the year 10210 AG
[Root]> setdate AG 10210

# Now ages for living characters will be calculated from 10210 AG
[Root]> ls
ID          Name              Born          Died        Age  ...
@I5@        Paul Atreides     ABT 10191 AG              19   ...
@I6@        Alia Atreides     ABT 10197 AG              13   ...
@I8@        Leto II Atreides  ABT 10210 AG              0    ...

# Check the current fictional date context
[Root]> showdate
Current Fictional Date Context:
  Calendar: AG
  Date:     10210/1/1

# Clear it to return to real-world dates
[Root]> cleardate
```

### Fictional Calendar Commands

- **`setdate <calendar> <year> [month] [day]`** - Set fictional date context
  - Example: `setdate AG 10191 1 1`
  - This becomes the "current date" for age calculations
  
- **`showdate`** - Display the current fictional date context
  - Shows what calendar and date is being used for living character ages
  
- **`cleardate`** - Clear fictional date context
  - Returns to using real-world current date for Gregorian calendars

### Advanced Usage

**Custom Calendars**

You can use any 2-4 letter calendar suffix in your GEDCOM files:
- `AG` - After Guild (Dune)
- `BG` - Before Guild (Dune)
- `UC` - Universal Century (Gundam)
- `SC` - Star Count (Star Wars)
- `SD` - Star Date (Star Trek)
- Any custom abbreviation for your world

**Multiple Calendars**

The navigator can handle GEDCOM files with multiple calendar systems. Statistics will show date ranges for each calendar separately.

**Date Precision**

- If only a year is specified: defaults to January 1
- If year and month: defaults to the 1st day
- Full dates: `setdate AG 10191 6 15` (June 15, 10191 AG)

### Tips for Fictional Genealogies

1. **Always set a date context** when working with fictional calendars
2. **Use consistent calendar suffixes** throughout your GEDCOM file
3. **Living characters show "?" age** until you set a fictional date context
4. **Date modifiers work** - Use ABT (about), EST (estimated), etc.

## Need Help?

- Type `help` anytime for command list
- Type `help <command>` for specific help (e.g., `help tree`)
- Type `help setdate` for detailed info on fictional calendars
- Type `exit` or press Ctrl+D to quit

Enjoy exploring your family history—real or fictional!
