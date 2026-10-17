// FortuneSheet's parser accepts TRUE()/FALSE() but not bare Excel boolean literals.
// Normalize tokens only for evaluation; keep the original cell formula intact.
export function normalizeBooleanLiterals(expression) {
  let out = "",
    quote = null;
  for (let i = 0; i < expression.length; ) {
    const ch = expression[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (expression[i + 1] === quote) {
          out += expression[++i];
        } else quote = null;
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    const m = expression.slice(i).match(/^(TRUE|FALSE)\b/i);
    const prev = expression[i - 1];
    if (m && (!prev || !/[A-Za-z0-9_.$]/.test(prev))) {
      const after = expression.slice(i + m[0].length);
      out += m[0] + (/^\s*[(!]/.test(after) ? "" : "()");
      i += m[0].length;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}
