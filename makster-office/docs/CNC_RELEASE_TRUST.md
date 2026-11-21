# Makster CNC Release Trust — 0.7

`Engineering.cncReady` and a production CNC authorization are deliberately different states.

## Gates

1. **Engineering Gate** — geometry and machining are complete enough to run automatically.
2. **Release Trust Gate** — every machining operation has an allowed provenance.
3. **Signature Gate** — the release manifest is signed by an Ed25519 private key held only by the server/KMS.
4. **Integrity Gate** — each exported file matches the SHA-256 recorded in the signed manifest.

Only a package that passes all four gates may set:

```text
status = signed
canReleaseToCnc = true
```

## Allowed provenance

Production release accepts:

- `makster_rule` — deterministic Makster-owned manufacturing rules;
- `manufacturer_catalog` — exact manufacturer catalogue data with manufacturer, article code and catalogue version;
- `manufacturer_bxf` — verified BXF adapter output with raw-file SHA-256, schema fingerprint and adapter id;
- `manual_verified` — a controlled manual verification record.

Release is blocked for:

- `fixture_only`;
- `estimated`;
- missing `verificationSource`;
- `reference_line` operations;
- incomplete BXF/catalog/manual provenance.

This means a test fixture may make the Engineering CNC pipeline green while the **Release Trust Gate still refuses production release**.

## Package files

A release package currently contains:

- `engineering.json`
- `cutlist.csv`
- `hardware.csv`
- `machining.csv`
- `issues.csv`
- `cnc-blockers.csv`
- optional `bxf-import-report.json`
- `release-manifest.json`
- `SHA256SUMS.txt`
- optional `release-public-key.pem` in local/test builds only

`release-manifest.json` contains file hashes, engineering identity, Project Revision, manufacturing-data provenance, trust result and optional Ed25519 signature.

## Signing key policy

Production private keys must not be stored in Postgres, a browser bundle, Git or the release package.

The runtime accepts:

```text
MAKSTER_CNC_SIGNING_KEY_ID
MAKSTER_CNC_SIGNING_PRIVATE_KEY_PEM
```

A production deployment should source those values from a KMS/secret manager. Supabase stores only the matching public key in `manufacturing_signing_keys`.

## Tamper detection

The verifier checks every file against the signed manifest. Changing even one coordinate in `machining.csv` changes its SHA-256 and invalidates the package.

## 0.7 test-only paths

`ManualVerifiedFixtureManufacturingDataProvider` and `--test-ephemeral-signing-key` exist only to prove the trust/signature pipeline. They must not be used as production manufacturing evidence.
