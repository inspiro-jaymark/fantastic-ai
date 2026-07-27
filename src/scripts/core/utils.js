function dl(content, name, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
function csvEsc(s) {
  s = s == null ? "" : "" + s;
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function esc(s) {
  return (s == null ? "" : "" + s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function parseCSV(text) {
  const rows = [];
  let i = 0,
    f = "",
    row = [],
    q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c == '"') {
        if (text[i + 1] == '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else {
      if (c == '"') q = true;
      else if (c == ",") {
        row.push(f);
        f = "";
      } else if (c == "\n" || c == "\r") {
        if (c == "\r" && text[i + 1] == "\n") i++;
        if (f !== "" || row.length) {
          row.push(f);
          rows.push(row);
          row = [];
          f = "";
        }
      } else f += c;
    }
    i++;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}
function read(k, d) {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "null");
    return v == null ? d : v;
  } catch (e) {
    return d;
  }
}
function store(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
}
function mdToHtml(md) {
  if (!md) return "";
  let h = esc(md);
  h = h
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, '<h3 style="font-size:15px">$1</h3>')
    .replace(/^# (.*)$/gm, '<h3 style="font-size:16px">$1</h3>');
  h = h
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<i>$1</i>")
    .replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
  h = h.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  h = h.replace(
    /(<li>[\s\S]*?<\/li>)/g,
    '<ul style="margin:4px 0 8px 18px">$1</ul>',
  );
  h = h.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  return h;
}
