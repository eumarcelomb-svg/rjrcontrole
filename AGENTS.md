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

- Keep manually entered daily hours until a valid, complete check-in/out replaces them, so partial punches do not erase calculated overtime.
- Keep presence-only duration separate from normal scheduled hours: overtime-only days use a default presence shift, while their normal-hour allowance stays zero; use the shared calculation for sheet, employee summary, and exports.
- Derive sheet totals and employee modal totals from the same period summary so normal and overtime values cannot diverge.
- Use the shared locale-aware employee ordering helper for lists so filtering and exports preserve consistent ordering without mutating stored data.
