import { readFileSync } from 'fs';
import iconv from 'iconv-lite';
import { parseLine, parseName } from './lineParser.js';
import { decodeAnsel, isAnsel } from './anselDecoder.js';
import { BUFFER_SIZES } from '../utils/constants.js';

/**
 * Main GEDCOM parser
 */
export class GedcomParser {
  constructor() {
    this.tree = {
      header: {},
      individuals: new Map(),
      families: new Map(),
      notes: new Map(),
      submitters: new Map()
    };
    this.currentRecord = null;
    this.currentEvent = null;
    this.stack = [];
  }

  /**
   * Parse a GEDCOM file
   */
  parse(filepath) {
    // Read file with proper encoding
    let content;
    let encoding = 'utf-8';

    try {
      const buffer = readFileSync(filepath);

      // First, try to detect encoding from GEDCOM header
      // Read first bytes as ASCII to find CHAR tag
      const headerPreview = buffer.slice(0, BUFFER_SIZES.HEADER_PREVIEW).toString('ascii');
      const charMatch = headerPreview.match(/1\s+CHAR\s+([\w-]+)/);

      if (charMatch) {
        const gedcomEncoding = charMatch[1].toUpperCase();

        // Map GEDCOM encoding names to iconv names
        switch (gedcomEncoding) {
          case 'ANSEL':
            // Check if it's actually ANSEL or mislabeled ISO-8859-1
            if (isAnsel(buffer)) {
              content = decodeAnsel(buffer);
              encoding = null; // Already decoded
            } else {
              encoding = 'latin1';
            }
            break;
          case 'ASCII':
            encoding = 'ascii';
            break;
          case 'UNICODE':
          case 'UTF-8':
          case 'UTF8':
            encoding = 'utf-8';
            break;
          case 'UTF-16':
          case 'UTF16':
            encoding = 'utf-16';
            break;
          default:
            // Try latin1 as fallback for unknown encodings
            encoding = 'latin1';
        }
      }

      // Decode with detected or default encoding
      if (encoding) {
        content = iconv.decode(buffer, encoding);
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }

    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i]);
      if (!parsed) continue;

      this.processLine(parsed, i + 1);
    }

    return this.tree;
  }

  /**
   * Process a parsed line
   */
  processLine(line, lineNumber) {
    const { level, xref, tag, value } = line;

    // Level 0 records
    if (level === 0) {
      this.finalizeCurrentRecord();

      if (tag === 'HEAD') {
        this.currentRecord = { type: 'header' };
      } else if (tag === 'TRLR') {
        this.finalizeCurrentRecord();
        return;
      } else if (xref) {
        // Start new record with ID
        this.currentRecord = {
          type: tag,
          id: xref,
          data: {}
        };
      } else if (tag === 'SUBM') {
        this.currentRecord = {
          type: 'SUBM',
          id: value,
          data: {}
        };
      }
      this.stack = [this.currentRecord];
      return;
    }

    // Higher level tags - attach to current context
    if (!this.currentRecord) return;

    const parent = this.stack[level - 1];
    if (!parent) return;

    // Process tag based on context
    if (this.currentRecord.type === 'INDI') {
      this.processIndividualTag(tag, value, level, parent);
    } else if (this.currentRecord.type === 'FAM') {
      this.processFamilyTag(tag, value, level, parent);
    } else if (this.currentRecord.type === 'NOTE') {
      this.processNoteTag(tag, value, level, parent);
    } else if (this.currentRecord.type === 'header') {
      this.processHeaderTag(tag, value, level, parent);
    } else if (this.currentRecord.type === 'SUBM') {
      this.processSubmitterTag(tag, value, level, parent);
    }
  }

  /**
   * Process individual (INDI) tags
   */
  processIndividualTag(tag, value, level, parent) {
    const data = this.currentRecord.data;

    switch (tag) {
      case 'NAME':
        data.name = parseName(value);
        break;
      case 'SEX':
        data.sex = value || '';
        break;
      case 'BIRT':
      case 'DEAT':
      case 'BAPM':
      case 'FCOM':
      case 'GRAD':
      case 'RESI':
        // Finalize previous event if exists
        this.finalizeEvent(data);
        this.currentEvent = { type: tag };
        this.stack[level] = this.currentEvent;
        break;
      case 'DATE':
        if (this.currentEvent) {
          this.currentEvent.date = value;
        }
        break;
      case 'PLAC':
        if (this.currentEvent) {
          this.currentEvent.place = value;
        }
        break;
      case 'ADDR':
        if (this.currentEvent) {
          this.currentEvent.address = { line: value };
        }
        this.stack[level] = this.currentEvent.address;
        break;
      case 'CITY':
        if (parent && parent.line !== undefined) {
          parent.city = value;
        }
        break;
      case 'CTRY':
        if (parent && parent.line !== undefined) {
          parent.country = value;
        }
        break;
      case 'TYPE':
        if (this.currentEvent) {
          this.currentEvent.eventType = value;
        }
        break;
      case 'NOTE':
        if (value.startsWith('@') && value.endsWith('@')) {
          data.notes = data.notes || [];
          data.notes.push({ ref: value });
        } else {
          if (this.currentEvent) {
            this.currentEvent.note = value;
          } else {
            data.notes = data.notes || [];
            data.notes.push({ text: value });
          }
        }
        break;
      case 'CONT':
        if (this.currentEvent && this.currentEvent.note) {
          this.currentEvent.note += '\n' + value;
        } else if (data.notes && data.notes.length > 0) {
          const lastNote = data.notes[data.notes.length - 1];
          if (lastNote.text) {
            lastNote.text += '\n' + value;
          }
        }
        break;
      case 'FAMC':
        this.finalizeEvent(data); // Finalize any pending event
        data.familiesAsChild = data.familiesAsChild || [];
        data.familiesAsChild.push(value);
        break;
      case 'FAMS':
        this.finalizeEvent(data); // Finalize any pending event
        data.familiesAsSpouse = data.familiesAsSpouse || [];
        data.familiesAsSpouse.push(value);
        break;
      case 'OBJE':
        this.finalizeEvent(data); // Finalize any pending event
        this.currentEvent = { type: 'OBJE' };
        this.stack[level] = this.currentEvent;
        break;
      case 'TITL':
        if (this.currentEvent && this.currentEvent.type === 'OBJE') {
          this.currentEvent.title = value;
        }
        break;
      case 'CHAN':
        this.finalizeEvent(data); // Finalize any pending event
        data.changeDate = {};
        this.stack[level] = data.changeDate;
        break;
      case 'TIME':
        if (parent && parent.date !== undefined) {
          parent.time = value;
        }
        break;
    }
  }

  /**
   * Finalize current event and add to data
   */
  finalizeEvent(data) {
    if (!this.currentEvent) return;

    const eventType = this.currentEvent.type;

    if (eventType === 'BIRT') {
      data.birth = { date: this.currentEvent.date || '', place: this.currentEvent.place || '' };
    } else if (eventType === 'DEAT') {
      data.death = { date: this.currentEvent.date || '', place: this.currentEvent.place || '' };
    } else if (eventType === 'BAPM') {
      data.baptism = {
        date: this.currentEvent.date || '',
        place: this.currentEvent.place || '',
        note: this.currentEvent.note || ''
      };
    } else if (eventType === 'FCOM') {
      data.firstCommunion = {
        date: this.currentEvent.date || '',
        place: this.currentEvent.place || '',
        note: this.currentEvent.note || ''
      };
    } else if (eventType === 'GRAD') {
      data.graduations = data.graduations || [];
      data.graduations.push({
        type: this.currentEvent.eventType || '',
        date: this.currentEvent.date || '',
        place: this.currentEvent.place || '',
        note: this.currentEvent.note || ''
      });
    } else if (eventType === 'RESI') {
      data.residences = data.residences || [];
      data.residences.push({
        date: this.currentEvent.date || '',
        address: this.currentEvent.address || { line: '' }
      });
    } else if (eventType === 'OBJE') {
      data.objects = data.objects || [];
      data.objects.push({
        title: this.currentEvent.title || ''
      });
    }

    this.currentEvent = null;
  }

  /**
   * Process family (FAM) tags
   */
  processFamilyTag(tag, value, level, parent) {
    const data = this.currentRecord.data;

    switch (tag) {
      case 'HUSB':
        data.husband = value;
        break;
      case 'WIFE':
        data.wife = value;
        break;
      case 'CHIL':
        data.children = data.children || [];
        data.children.push(value);
        break;
      case 'MARR':
        this.finalizeFamilyEvent(data);
        this.currentEvent = { type: 'MARR' };
        this.stack[level] = this.currentEvent;
        break;
      case 'DIV':
        this.finalizeFamilyEvent(data);
        this.currentEvent = { type: 'DIV' };
        this.stack[level] = this.currentEvent;
        break;
      case 'DATE':
        if (this.currentEvent) {
          this.currentEvent.date = value;
        }
        break;
      case 'PLAC':
        if (this.currentEvent) {
          this.currentEvent.place = value;
        }
        break;
      case 'NCHI':
        data.numberOfChildren = parseInt(value, 10) || 0;
        break;
      case 'NOTE':
        data.notes = data.notes || [];
        if (value.startsWith('@') && value.endsWith('@')) {
          data.notes.push({ ref: value });
        } else {
          data.notes.push({ text: value });
        }
        break;
      case 'CONT':
        if (data.notes && data.notes.length > 0) {
          const lastNote = data.notes[data.notes.length - 1];
          if (lastNote.text) {
            lastNote.text += '\n' + value;
          }
        }
        break;
      case 'CHAN':
        this.finalizeFamilyEvent(data); // Finalize any pending event
        data.changeDate = {};
        this.stack[level] = data.changeDate;
        break;
      case 'TIME':
        if (parent && parent.date !== undefined) {
          parent.time = value;
        }
        break;
    }
  }

  /**
   * Finalize family event
   */
  finalizeFamilyEvent(data) {
    if (!this.currentEvent) return;

    if (this.currentEvent.type === 'MARR') {
      data.marriage = {
        date: this.currentEvent.date || '',
        place: this.currentEvent.place || ''
      };
    } else if (this.currentEvent.type === 'DIV') {
      data.divorce = {
        date: this.currentEvent.date || '',
        place: this.currentEvent.place || ''
      };
    }

    this.currentEvent = null;
  }

  /**
   * Process note (NOTE) tags
   */
  processNoteTag(tag, value, level, parent) {
    const data = this.currentRecord.data;

    switch (tag) {
      case 'CONT':
        data.text = data.text || '';
        data.text += '\n' + value;
        break;
      case 'CHAN':
        data.changeDate = {};
        this.stack[level] = data.changeDate;
        break;
      case 'DATE':
        if (parent && parent !== this.currentRecord.data) {
          parent.date = value;
        }
        break;
      case 'TIME':
        if (parent && parent.date !== undefined) {
          parent.time = value;
        }
        break;
    }
  }

  /**
   * Process header (HEAD) tags
   */
  processHeaderTag(tag, value, level, parent) {
    switch (tag) {
      case 'SOUR':
        this.tree.header.source = { name: value };
        this.stack[level] = this.tree.header.source;
        break;
      case 'VERS':
        if (parent && parent.name !== undefined) {
          parent.version = value;
        } else if (parent && parent.gedcom !== undefined) {
          parent.gedcom.version = value;
        }
        break;
      case 'NAME':
        if (parent && parent.name !== undefined) {
          parent.name = value;
        }
        break;
      case 'CORP':
        if (parent && parent.name !== undefined) {
          parent.corporation = value;
        }
        break;
      case 'ADDR':
        if (parent && parent.name !== undefined) {
          parent.address = value;
        }
        break;
      case 'DEST':
        this.tree.header.destination = value;
        break;
      case 'DATE':
        if (parent === this.currentRecord) {
          this.tree.header.date = value;
        }
        break;
      case 'TIME':
        this.tree.header.time = value;
        break;
      case 'SUBM':
        this.tree.header.submitter = value;
        break;
      case 'FILE':
        this.tree.header.file = value;
        break;
      case 'GEDC':
        this.tree.header.gedcom = {};
        this.stack[level] = this.tree.header.gedcom;
        break;
      case 'FORM':
        if (parent && parent.gedcom !== undefined) {
          parent.gedcom.form = value;
        }
        break;
      case 'CHAR':
        this.tree.header.encoding = value;
        break;
    }
  }

  /**
   * Process submitter (SUBM) tags
   */
  processSubmitterTag(tag, value, level, parent) {
    const data = this.currentRecord.data;

    switch (tag) {
      case 'NAME':
        data.name = value;
        break;
      case 'CHAN':
        data.changeDate = {};
        this.stack[level] = data.changeDate;
        break;
      case 'DATE':
        if (parent && parent !== this.currentRecord.data) {
          parent.date = value;
        }
        break;
      case 'TIME':
        if (parent && parent.date !== undefined) {
          parent.time = value;
        }
        break;
    }
  }

  /**
   * Finalize current record and add to tree
   */
  finalizeCurrentRecord() {
    if (!this.currentRecord) return;

    const { type, id, data } = this.currentRecord;

    // Finalize any pending events
    if (type === 'INDI') {
      this.finalizeEvent(data);
      // Set defaults for INDI
      if (!data.name) {
        data.name = parseName('');
      }
      this.tree.individuals.set(id, { id, ...data });
    } else if (type === 'FAM') {
      this.finalizeFamilyEvent(data);
      this.tree.families.set(id, { id, ...data });
    } else if (type === 'NOTE') {
      const noteText = data.text || id;
      this.tree.notes.set(id, { id, text: noteText, ...data });
    } else if (type === 'SUBM') {
      this.tree.submitters.set(id, { id, ...data });
    }

    this.currentRecord = null;
    this.currentEvent = null;
    this.stack = [];
  }
}
