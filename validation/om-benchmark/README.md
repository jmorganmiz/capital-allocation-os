# Real-OM validation

This folder is the controlled benchmark for Dealstash document extraction. Real offering memorandums, ground truth, and generated reports are intentionally ignored by Git.

## Prepare the sample

1. Put 20 permitted PDFs in `validation/om-benchmark/documents/`.
2. Copy `ground-truth.example.json` to `ground-truth.json`.
3. Add one case per PDF and manually verify every expected field against the document. Use `null` when the field is genuinely absent.
4. Keep pricing values `null` unless the current provider rates have been independently verified.

The sample should include text PDFs, scanned PDFs, sparse broker packages, conflicting values, missing asking prices, and at least two non-multifamily documents.

## Validate without transmitting documents

```bash
npm run benchmark:om -- --dry-run
```

## Run the benchmark

The extraction step sends the PDFs to the configured Anthropic account. Run it only when the documents are permitted for external processing:

```bash
npm run benchmark:om -- --consent-external-processing
```

Reports are written to the ignored `reports/` directory. They contain extracted numeric values and metrics but omit citation excerpts.

## Launch gate

- At least 20 real documents
- Field accuracy at or above 90%
- Citation coverage at or above 90%
- Zero unexplained false positives on purchase price, units, debt terms, or operating expenses
- Every miss reviewed and classified as prompt, OCR, document ambiguity, unsupported field, or ground-truth error
