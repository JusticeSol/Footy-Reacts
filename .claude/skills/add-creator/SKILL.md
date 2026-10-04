---
name: add-creator
description: Add a YouTube creator to the Footy Reacts roster end to end — vet the channel, choose its club affinity, run creator:add, pull its uploads, and check what landed. Use whenever the user wants to add, onboard or include a creator, channel or YouTuber, names a fan channel or @handle to bring in, asks to cover a club that has no creator, or wants to replace a dormant channel, even if they never say "creator:add".
---

# Add a creator

Adding a creator is one command, `creator:add`, but the command can't judge
whether the channel is worth adding. Both bad additions so far looked fine at add
time: one handle resolved to a Sunday-league team's channel, another channel had
been dormant for weeks. So most of this workflow is checking the channel before
the command runs and checking the results after.

All commands need `.env.local`. **Quote every `@handle`**, because in PowerShell
a bare `@word` is the splatting operator and never reaches the script.

## 1. Vet the channel

```bash
npm run probe -- "@handle"
```

Probe prints the channel's real title and handle, its upload count for the last
14 days and its five latest titles. It costs a few quota units. Read the output
for three things:

- **Identity.** Is the title the channel the user meant? A handle can resolve to
  a namesake.
- **Activity.** Zero uploads in 14 days means dormant, unless it's an
  international break (see `docs/STATUS.md`). A dormant channel adds nothing to
  the site, and that's why Brentford has no creator: five fan channels were all
  dead.
- **Kind of content.** Match reactions, previews and post-match rants are what
  the site shows. Transfer news, shorts and general-football entertainment get
  rejected by the tagger by design, so a channel that posts only those will
  produce almost nothing visible.

If the handle doesn't resolve, `npm run find:channel -- "Channel Name"` finds the
`UC…` id. It costs 100 quota units per call, so run it once by hand and never in
a loop. Then probe the id.

Report what probe showed. If the channel is dormant, a namesake, or mostly
non-reaction content, say so and let the user decide before going further. They
have added general channels on purpose before (Kombo's Diary, Matty FC).

## 2. Decide the club affinity

`--clubs` takes the three-letter abbreviations from the fixture board, comma
separated (`ARS`, `MCI,MUN`). If an abbreviation is wrong, the script lists the
valid ones.

Affinity is the tagger's strongest signal, because it raises vague titles above
the publish floor. That cuts both ways:

- For a **single-club fan channel**, give that club. Leaving it out hides many
  genuine takes.
- For a **general-football channel**, give no clubs. Affinity on a channel that
  covers everything would put its news and opinion content on that club's match
  pages. This is the deliberate choice recorded for Kombo's Diary and Matty FC.

If it's unclear which kind the channel is, ask. Also check whether the club
already has creators (`npm run coverage`), since the roster values covering
every club over piling onto one.

## 3. Add

```bash
npm run creator:add -- --name "Display Name" --handle "@handle" --clubs ARS
npm run creator:add -- --name "Display Name" --channel UCxxxx --clubs ARS
```

`--name` is shown on the site and becomes the id (`creator-display-name`).
Re-running with the same name updates that creator rather than adding a
duplicate. If the channel changed, it also deletes the takes that came from the
old channel.

The command writes to two places: `src/data/seed.json` and whichever store
`.env.local` points at. The output's `store` line tells you which. `supabase`
means the live site is changed. Read the output:

- `⚠ resolved channel name differs` means stop and confirm with the user. This
  warning is how the Sunday-league mistake would have been caught.
- `store json` means the live site was **not** changed. Tell the user it only
  went into local data.

## 4. Pull uploads and check

```bash
npm run sync:takes 96
npm run creator:list
npm run coverage
```

- `sync:takes` polls every creator and only adds videos it hasn't seen before,
  so running it again is safe. Use 96 hours so the last matchday's reactions are
  included.
- In `creator:list`, check the new creator's take count. Also look for a
  `COLLISION` line, which means two creators point at one channel and one of
  them is wrong.
- Zero takes isn't automatically a failure. During a break, or for a
  general channel, that's expected. If it's surprising, use
  `npm run debug:uploads 96` to see each video's tagging decision without
  writing anything.

## 5. Commit and report

`seed.json` is the version-controlled roster. Commit the change with a message
like `Add <Name>`. If the creator went in without clubs or with an unusual
choice, the commit body should say why, as past commits do. Commit only
if the user asks or has already said to commit.

Finish with a short report:

- who was added
- channel title and id
- clubs
- which store was written
- takes pulled
- any warnings

If `docs/STATUS.md` has a creator count or coverage line, offer to update it.

If the user is doing outreach, `npm run outreach -- --creator <name>` writes the
creator's personalised message. It skips creators with no visible takes yet.

## Removing instead

`npm run creator:remove -- --id "Name"` is a dry run that shows what would go;
add `--yes` to delete the creator and their takes from the store and
`seed.json`. Honour an opt-out the same day, because the outreach message
promises that.
