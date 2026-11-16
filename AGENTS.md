<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep manually entered daily hours until a valid, complete check-in/out replaces them; a partial punch without manual hours assumes the normal start/end for the missing side, so a lone check-out still yields overtime.
- Keep presence-only duration separate from normal scheduled hours: overtime-only days use a default presence shift, while their normal-hour allowance stays zero; use the shared calculation for sheet, employee summary, and exports.
- Derive sheet totals and employee modal totals from the same period summary so normal and overtime values cannot diverge.
- Use the shared locale-aware employee ordering helper for lists so filtering and exports preserve consistent ordering without mutating stored data.
- Version and validate complete JSON backups before confirmation; restore through an invoker-rights transactional RPC so failures cannot partially replace data.
- Paginate cloud reads explicitly so full-state backups include records beyond the Data API page limit.
- Generate collective EPI receipt PDFs on demand in the browser, starting each job-function group on a fresh A4 landscape page and preserving its heading across overflow pages; keep a separate ready-to-download action for mobile user activation and do not persist unsigned receipts as delivery records.
- Keep manual attendance PDFs separate from calculated attendance exports, using the current filtered employee list and a selected date without modifying attendance records.
- Generate VT signature sheets on demand in the browser with draft transport-by-colleague flags and a separate download action; unsigned sheets must not become payment records or change attendance/payroll data.
- Store actual EPI deliveries separately from attendance and unsigned PDFs, with employee identity snapshots and no cascading employee foreign key so attendance-backup restores cannot erase delivery history; attendance JSON backups do not include EPI deliveries.
- Load and write EPI history from the browser Supabase client (same path as the attendance sheet, route ssr:false, Query with retries) respecting existing no-login RLS, paginate every full read, and validate mutations before writing; signature confirmation is a manual paper-receipt status, not an electronic signature.
- EPI error recovery resets the failed Query and router boundary together, and reports the original error to preview telemetry so transient load failures can be retried and diagnosed.
- Keep historical overtime corrections in payment-scoped records separate from attendance; add only supplemental hours and snapshot their periods, rates and reasons inside the payroll closure so corrections do not recur in later payments.
- Payroll PDFs must use only saved closure snapshots, including daily overtime amounts and adjustments; legacy snapshots show unsaved dates as unavailable rather than reconstructing from live attendance, and browser generation exposes a separate download action for mobile activation.
