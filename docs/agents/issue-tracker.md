# Issue Tracker: GitHub

Issues and PRDs for `Jaush-M/LMS` live in GitHub Issues. Use the `gh` CLI for all issue operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply a label**: `gh issue edit <number> --add-label "..."`
- **Remove a label**: `gh issue edit <number> --remove-label "..."`
- **Close an issue**: `gh issue close <number> --comment "..."`

When filtering issue lists, add the appropriate `--label`, `--state`, or `--search` flags.

Run `gh` from inside this repo so it can infer `Jaush-M/LMS` from the Git remote.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `Jaush-M/LMS`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
