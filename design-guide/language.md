# Language

Plaza speaks like a machine — but a friendly one.

---

## Voice Principles

### Technical, Not Cold
The interface uses technical language but isn't hostile. It's precise without being bureaucratic.

**Good:** `SUBMIT` / `SEND` / `EXECUTE`
**Bad:** `Let's go!` / `Share your thoughts` / `You got this!`

### Status-Oriented
The system constantly reports its state. Users should feel like they're monitoring something real.

**Good:** `[CONNECTION ESTABLISHED]` / `[SYNC COMPLETE]`
**Bad:** `You're connected!` / `All done!`

### Confident Brevity
Say it once, say it short. No redundancy, no hedging.

**Good:** `ACCESS DENIED`
**Bad:** `Sorry, we couldn't verify your access at this time.`

---

## Formatting Rules

### UPPERCASE for Commands
Headers, labels, button text, system messages — all caps.

```
ENTER
SUBMIT
CANCEL
[ENCRYPTED MESSAGE]
```

### Brackets for Metadata
Timestamps, status codes, system states get brackets.

```
[12:34:56 UTC]
[200 OK]
[PENDING]
[BLOCKCHAIN STORAGE ACTIVE]
```

### Mixed Case for Content
User-generated content and longer text stays in mixed case for readability.

### Dots for Loading
Ellipsis (three dots) indicates ongoing process.

```
CONNECTING...
LOADING...
SYNCING...
```

---

## Terminal Character Icons

Plaza uses typography instead of graphic icons:

| Symbol | Meaning |
|--------|---------|
| `>` | Command prompt, input prefix, "go" |
| `#` | Channel prefix |
| `[ ]` | Enclosures for metadata |
| `x` | Close, dismiss |
| `█` | Loading cursor (blinking) |
| `▶` | Send, action, play |
| `!` | Warning |
| `✓` | Success |

---

## Sample Phrases

### Actions
- `ENTER`
- `SUBMIT`
- `EXECUTE`
- `CANCEL`
- `DISMISS`

### States
- `[ONLINE]`
- `[OFFLINE]`
- `[SYNCED]`
- `[PENDING]`
- `[ENCRYPTED]`

### Feedback
- `ACCESS GRANTED`
- `ACCESS DENIED`
- `OPERATION COMPLETE`
- `CONNECTION RESET`
- `AWAITING INPUT`

### Prompts
- `ENTER PASSPHRASE`
- `SELECT CHANNEL`
- `CONFIRM ACTION`

---

## What Not to Do

| Avoid | Why |
|-------|-----|
| Emojis | Breaks terminal aesthetic |
| Exclamation enthusiasm | "Great job!" feels wrong |
| Questions as prompts | "What would you like to do?" is too soft |
| Apologies | "Sorry, something went wrong" — just state the error |
| Marketing speak | "Unlock your potential" doesn't belong here |

---

## The Tone Test

Read your text aloud. Does it sound like:

- A 1980s mainframe terminal? ✓
- A friendly mobile app? ✗
- A military system? ✓ (but friendlier)
- A startup landing page? ✗

If it could appear in a William Gibson novel, it's probably right.
