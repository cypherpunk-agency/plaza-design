# Forms

Form inputs are **interactive elements** — they follow the same hierarchy rules as buttons.

---

## The Rule

> Form inputs use **2px borders** like buttons. They're meant to be interacted with.

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0;">
  <div style="flex: 1; min-width: 150px;">
    <div style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Default</div>
    <div style="padding: 0.75rem; border: 2px solid var(--color-primary-600); background: rgba(0,0,0,0.4); color: var(--color-text-faint);">Placeholder...</div>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <div style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Focus</div>
    <div style="padding: 0.75rem; border: 2px solid var(--color-primary-500); background: rgba(0,0,0,0.4); color: var(--color-primary-400); box-shadow: 0 0 10px rgba(var(--color-primary-500-rgb), 0.3);">Input text</div>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <div style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Error</div>
    <div style="padding: 0.75rem; border: 2px solid var(--color-error); background: rgba(0,0,0,0.4); color: var(--color-primary-400); box-shadow: 0 0 10px rgba(var(--color-error-rgb), 0.3);">Invalid value</div>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <div style="font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 4px;">Success</div>
    <div style="padding: 0.75rem; border: 2px solid var(--color-success); background: rgba(0,0,0,0.4); color: var(--color-primary-400); box-shadow: 0 0 10px rgba(var(--color-success-rgb), 0.3);">Valid input</div>
  </div>
</div>

---

## Text Input

**Class:** `.plaza-input`

```html
<input type="text" class="plaza-input" placeholder="Enter value..." />
```

| Property | Value |
|----------|-------|
| Border | 2px solid primary-600 |
| Background | rgba(0, 0, 0, 0.4) |
| Color | primary-400 |
| Focus | primary-500 border + glow |

---

## Textarea

**Class:** `.plaza-textarea`

```html
<textarea class="plaza-textarea" placeholder="Enter message..."></textarea>
```

Same styling as text input. Default `min-height: 100px`, resizable vertically.

---

## Select

**Class:** `.plaza-select`

```html
<select class="plaza-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

Custom dropdown arrow using SVG data URI. Maintains terminal aesthetic.

---

## Validation States

### Error
**Class:** `.plaza-input--error`

```html
<input type="text" class="plaza-input plaza-input--error" />
```

- Border: `--color-error`
- Focus glow: Red

### Success
**Class:** `.plaza-input--success`

```html
<input type="text" class="plaza-input plaza-input--success" />
```

- Border: `--color-success`
- Focus glow: Green

---

## Checkbox & Radio

**Classes:** `.plaza-checkbox`, `.plaza-radio`

```html
<label class="plaza-checkbox-label">
  <input type="checkbox" class="plaza-checkbox" />
  Enable feature
</label>

<label class="plaza-radio-label">
  <input type="radio" name="option" class="plaza-radio" />
  Option A
</label>
```

| Property | Value |
|----------|-------|
| Size | 18px × 18px |
| Border | 2px solid primary-600 |
| Checked | primary-500 fill + glow |

Radio buttons are circular. Checkboxes show `✓` when checked.

---

## Labels

**Class:** `.plaza-label`

```html
<label class="plaza-label">Username</label>
<input type="text" class="plaza-input" />
```

- Uppercase
- 12px font
- Letter spacing 0.1em
- Gray-400 color

### Required Fields
**Class:** `.plaza-label--required`

```html
<label class="plaza-label plaza-label--required">Email</label>
```

Adds red asterisk after label.

---

## Form Groups

**Class:** `.plaza-form-group`

```html
<div class="plaza-form-group">
  <label class="plaza-label">Username</label>
  <input type="text" class="plaza-input" />
</div>
```

Adds consistent bottom margin between form elements.

---

## Error Messages

**Class:** `.plaza-error-message`

```html
<div class="plaza-form-group">
  <input type="text" class="plaza-input plaza-input--error" />
  <span class="plaza-error-message">Invalid input</span>
</div>
```

---

## Design Principles

### Focus is Key
The enhanced glow on focus signals "this is where you're typing." It's the visual equivalent of a blinking cursor for the whole field.

### 2px Border = Interactive
Form inputs follow the same hierarchy as buttons. If it accepts user input, it gets the thick border.

### Validation is Semantic
Error = red, success = green. These are universal patterns that work across all themes.

---

## Example Form

```html
<form>
  <div class="plaza-form-group">
    <label class="plaza-label plaza-label--required">Username</label>
    <input type="text" class="plaza-input" placeholder="Enter username..." />
  </div>

  <div class="plaza-form-group">
    <label class="plaza-label plaza-label--required">Password</label>
    <input type="password" class="plaza-input" placeholder="Enter password..." />
  </div>

  <div class="plaza-form-group">
    <label class="plaza-checkbox-label">
      <input type="checkbox" class="plaza-checkbox" />
      Remember me
    </label>
  </div>

  <button type="submit" class="plaza-btn">SUBMIT</button>
</form>
```
