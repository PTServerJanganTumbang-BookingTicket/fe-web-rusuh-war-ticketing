# Memory: GitHub Project Configuration

> Reference untuk GitHub Project "SJT Rusuh Booking Tiket - Kanban"

## Project Info

| Property | Value |
|----------|-------|
| Project Number | 2 |
| Project ID | PVT_kwDOFGitZc4Bp3Oc |
| Owner | PTServerJanganTumbang-BookingTicket |
| Title | SJT Rusuh Booking Tiket - Kanban |
| State | open |

## Status Field

Field ID: `PVTSSF_lADOFGitZc4Bp3OczhoQ3J4`

| Status | Option ID | Usage |
|--------|-----------|-------|
| Backlog | f75ad846 | Item baru, belum dikerjakan |
| Ready | 61e4505c | Siap dikerjakan, dependencies clear |
| In progress | 47fc9ee4 | Sedang dikerjakan |
| In review | df73e18b | PR merged, menunggu sanity testing |
| Done | 98236657 | Sanity testing passed, task fully complete |

## Task Lifecycle Flow

```
Backlog → Ready → In progress → In review → Done
                                    ↑
                              PR merged,
                          sanity testing
```

**PENTING**: Setelah PR merge, task **HARUS** masuk ke "In review" dulu untuk sanity testing.
Task hanya boleh dipindah ke "Done" setelah sanity testing passed.

## Size Field

Field ID: `PVTSSF_lADOFGitZc4Bp3OczhoQ3wU`

| Size | Option ID | Story Points |
|------|-----------|--------------|
| XS | 6c6483d2 | 1 |
| S | f784b110 | 2 |
| M | 7515a9f1 | 3 |
| L | 817d0097 | 5 |
| XL | db339eb2 | 8 |

## Common Commands

### List All Items
```bash
gh project item-list 2 --owner PTServerJanganTumbang-BookingTicket --format json
```

### Update Item Status
```bash
gh project item-edit \
  --project-id PVT_kwDOFGitZc4Bp3Oc \
  --id <ITEM_ID> \
  --field-id PVTSSF_lADOFGitZc4Bp3OczhoQ3J4 \
  --single-select-option-id <STATUS_OPTION_ID>
```

### Add Item to Project
```bash
gh project item-add 2 --owner PTServerJanganTumbang-BookingTicket --url <ISSUE_OR_PR_URL>
```

### Create Draft Item
```bash
gh project item-create 2 --owner PTServerJanganTumbang-BookingTicket --title "<TITLE>"
```

## Workflow Integration

### Setelah PR Merge (Default: In review)
```
/workflow sjt-backlog-update pr_number=<PR_NUMBER>
```
Default akan ke "In review" untuk sanity testing.

### Setelah Sanity Testing Pass (Manual: Done)
```
/workflow sjt-backlog-update pr_number=<PR_NUMBER> new_status=Done
```
Atau manual dengan gh CLI.

### Manual Update
1. `gh pr view <PR_NUMBER> --json state` - verifikasi merged
2. `gh project item-list 2 --owner PTServerJanganTumbang-BookingTicket` - cari item
3. `gh project item-edit ...` - update status ke In review/Done
