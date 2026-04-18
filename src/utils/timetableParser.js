export async function parseTimetablePDF(file) {
  // We use dynamic import so it doesn't inflate the main bundle
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let allText = '';
  let allTextItems = [];
  
  // Cap at 3 pages maximum
  const numPagesToProcess = Math.min(3, pdf.numPages);

  // Extract from all pages
  for (let pageNum = 1; pageNum <= numPagesToProcess; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Get items WITH their positions (x, y coordinates)
    const items = textContent.items.map(item => ({
      text: item.str.trim(),
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
      width: Math.round(item.width),
      height: Math.round(item.height),
      page: pageNum
    })).filter(item => item.text.length > 0);
    
    allTextItems = [...allTextItems, ...items];
    allText += textContent.items.map(i => i.str).join(' ') + '\n';
  }
  
  return runParser(allText, allTextItems);
}

function runParser(allText, items) {
  let slots = [];
  let confidence = 'low';
  let method = 'position-based';

  // Y-clustering (Row detection)
  const rows = [];
  items.sort((a, b) => b.y - a.y); // Top to bottom (higher Y is higher on page)

  items.forEach(item => {
    let added = false;
    for (let row of rows) {
      if (Math.abs(row.y - item.y) <= 5) { // 5px tolerance
        row.items.push(item);
        added = true;
        break;
      }
    }
    if (!added) {
      rows.push({ y: item.y, items: [item] });
    }
  });

  // Sort rows top-to-bottom (just in case)
  rows.sort((a, b) => b.y - a.y);

  // Sort items in each row left-to-right
  rows.forEach(row => row.items.sort((a, b) => a.x - b.x));

  const standardDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAliasMap = {
    'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
    'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
  };

  const getFullDayName = (text) => {
    const cleaned = text.replace(/[^a-z]/gi, '').toLowerCase();
    if (standardDays.map(d => d.toLowerCase()).includes(cleaned)) {
      return standardDays.find(d => d.toLowerCase() === cleaned);
    }
    return dayAliasMap[cleaned.substring(0, 3)] || null;
  };

  // Find Header Column Positions
  let lectureColumns = []; // Array of X boundaries { startX, endX, lecNo }

  // Detect lectures from all items to find columns
  items.forEach(item => {
    const txt = item.text.toLowerCase();
    const isHeader = txt.includes('lecture') || txt.includes('lec') || txt.includes('period') || txt.includes('slot') || /^[l]?\d+$/.test(txt);
    if (isHeader) {
      const match = item.text.match(/\d+/);
      if (match) {
        const lecNo = parseInt(match[0], 10);
        if (lecNo >= 1 && lecNo <= 8) {
          lectureColumns.push({
            lecNo,
            x: item.x,
            width: item.width
          });
        }
      }
    }
  });

  // Deduplicate columns by X position
  lectureColumns.sort((a, b) => a.x - b.x);
  let mergedCols = [];
  lectureColumns.forEach(col => {
    if (mergedCols.length === 0 || Math.abs(mergedCols[mergedCols.length - 1].x - col.x) > 20) {
      mergedCols.push(col);
    }
  });

  // Now scan rows for day names and assign slots based on X match
  rows.forEach(row => {
    const dayItem = row.items.find(i => getFullDayName(i.text));
    if (dayItem) {
      const day = getFullDayName(dayItem.text);
      
      row.items.forEach(cell => {
        if (cell === dayItem) return;
        if (cell.text.replace(/[-\s]/g, '') === '') return;

        // Find which column this cell belongs to
        let assignedCol = null;
        let minDiff = Infinity;

        mergedCols.forEach(col => {
          const diff = Math.abs(col.x - cell.x);
          // If the cell's starting X is reasonably close to the header's X
          // or is contained within the column visual span
          if (diff < minDiff && diff < 50) { 
            minDiff = diff;
            assignedCol = col;
          }
        });

        if (assignedCol) {
          const { subject_code, room } = parseCellContent(cell.text);
          if (subject_code) {
             slots.push({
               day,
               lecture_no: assignedCol.lecNo,
               subject_code,
               room
             });
          }
        }
      });
    }
  });

  if (slots.length >= 10) {
    confidence = 'high';
  } else if (slots.length >= 3) {
    confidence = 'medium';
  } else {
    // Fallback: Plain text parsing
    method = 'text-fallback';
    slots = fallbackParse(allText);
    if (slots.length > 0) confidence = 'low';
  }

  // Deduplicate slots based on day and lecture No, prioritizing earliest found
  const finalSlotsMap = {};
  slots.forEach(s => {
    const k = `${s.day}-${s.lecture_no}`;
    if (!finalSlotsMap[k]) finalSlotsMap[k] = s;
  });

  return {
    slots: Object.values(finalSlotsMap),
    rawText: allText,
    confidence,
    method
  };
}

function parseCellContent(text) {
  let subject_code = text;
  let room = null;

  // Split patterns
  const splitMatch = text.match(/(.*?)(?:\s*(?:-|\/|\()\s*)(.*)/);
  if (splitMatch) {
    const part1 = splitMatch[1].trim();
    let part2 = splitMatch[2].trim();
    if (part2.endsWith(')')) part2 = part2.slice(0, -1).trim();

    // Look for room indicators in part2 or numbers
    if (/\d/.test(part2) || /lab|room|lt|hall/i.test(part2)) {
      subject_code = part1;
      room = part2;
    } else if (/\d/.test(part1) || /lab|room|lt|hall/i.test(part1)) {
      subject_code = part2;
      room = part1;
    }
  }

  if (subject_code.length > 20) return { subject_code: null, room: null }; // false positive

  return { subject_code, room };
}

function fallbackParse(text) {
  // Minimal fallback parsing
  const slots = [];
  const lines = text.split('\n');
  let currentDay = null;
  let lecCounter = 1;

  const dayRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday)/i;

  lines.forEach(line => {
    const dMatch = line.trim().match(dayRegex);
    if (dMatch) {
      currentDay = dMatch[1].charAt(0).toUpperCase() + dMatch[1].slice(1).toLowerCase();
      lecCounter = 1;
    }

    if (currentDay && line.trim().length > 2 && !dMatch) {
      // Very naive split
      const words = line.trim().split(/\s+/).filter(w => w.length > 1 && !/lec|period/i.test(w));
      words.forEach(w => {
        if (lecCounter <= 8) {
          slots.push({
            day: currentDay,
            lecture_no: lecCounter,
            subject_code: w,
            room: null
          });
          lecCounter++;
        }
      });
    }
  });

  return slots;
}
