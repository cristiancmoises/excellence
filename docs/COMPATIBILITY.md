# Compatibility — 0.1.0-rc.1

[Português brasileiro](COMPATIBILITY.pt-BR.md)

Excellence provides spreadsheet editing with a defined scope. This release
does not certify full equivalence with Microsoft Excel or complete Office
format coverage. Keep original files when importing important documents.

| Feature | Editor / native format | XLSX |
| --- | --- | --- |
| Numbers, text and booleans | Supported | Import/export |
| Rich text and multiple lines | Supported | Content and basic styles preserved |
| FortuneSheet formulas | English function names | Formula and cached result; Excel may recalculate |
| Sheets, names and cross-sheet references | Supported | Names and formulas preserved |
| Number formats, fonts, colors and fills | Supported | Basic conversion |
| Alignment, wrapping and dimensions | Supported | Basic conversion |
| Merged cells | Supported | Import/export |
| Borders | Supported | Conversion not implemented |
| Comments | Supported | Simple notes; no threaded comments |
| Filters, validation and conditional formatting | Engine features | Rules not preserved during conversion |
| Excellence charts | Column, line and doughnut; up to 20 | Not exported to XLSX |
| Group summaries | New, static aggregated sheet | Sheet values exported |
| Excel pivot tables | Not implemented | Not preserved |
| VBA, macros, ActiveX and add-ins | Not executed | Not preserved |
| Power Query, Power Pivot, DAX and external connections | Not implemented | Not preserved |
| Legacy XLS, XLSB, XLSM, ODS and encrypted files | Not supported | Unencrypted XLSX only |
| Imported charts/images | Not supported | Not preserved |
| Live coediting/sharing | Not implemented | Accounts isolated; session conflicts checked |
| Paginated printing/native PDF | Not implemented | Export to a compatible pagination application |
| Every Excel function/dynamic array | Not guaranteed | Unsupported functions may produce errors |

English is the default interface and documentation language. Brazilian
Portuguese is available as a secondary language. Changing interface language
does not translate existing workbook contents or change formula function names.

## Limits

- 30 sheets, each with up to 10,000 rows and 256 columns.
- 100,000 populated cells per file, summed across sheets.
- Persisted document: 8 MiB UTF-8 JSON. Import: 10 MiB; declared expanded XLSX
  ZIP entries: 64 MiB.
- Up to 100 files or 50 MiB of current documents per account; up to 100 accounts.
- Up to 20 revisions per document. History needs additional disk space; a
  worst-case account can use about 1 GiB beyond its current documents, before
  SQLite and backup overhead. Monitor available storage.
- The private assistant accepts up to 500 cells, 100 proposed changes and an
  8,000-character instruction. External adapters time out after 45 seconds;
  local Ollama uses a 90-second timeout and an additional 2,000-byte combined
  task/context limit. Public demo limits are smaller; see [LLM](LLM.md).
- CSV exports formula results. Text that could be interpreted as a formula is
  prefixed with an apostrophe. CSV does not preserve styles, charts or sheets.

Browser tests exercise SUM, AVERAGE, COUNT, IF, SUMIF, VLOOKUP, IFERROR, ROUND,
arithmetic and cross-sheet references. This does not certify every function.
Cell limits are protective limits, not measured performance promises. Large
regions may consume substantial RAM; maximum-size workbooks and deeply chained
formulas have not been qualified. Conversion may lose unmodeled features even
when a file opens successfully.
