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

## Need Help?

- Type `help` anytime for command list
- Type `help <command>` for specific help (e.g., `help tree`)
- Type `exit` or press Ctrl+D to quit

Enjoy exploring your family history!
