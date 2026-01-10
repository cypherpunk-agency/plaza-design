# Hierarchy

The most important design decision in Plaza: **what demands attention, what supports it, and what sets the mood.**

---

## Space and Attention

Look at this page. There's the **dark background** — empty space. And there's the **content** — filled space inside containers and windows.

Your eyes are naturally drawn to the filled space. That's where things happen. The empty space around it provides relief — room to breathe.

This interplay between **negative space** (empty) and **positive space** (filled) creates visual rhythm. Too much filled space feels cramped. Too much empty space feels abandoned. The balance is what makes a design feel right.

A window is a bordered container that says *"look here."*

<div style="display: flex; justify-content: center; padding: 2rem 0;">
  <div style="width: 300px; border: 2px solid var(--color-primary-500); box-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.3);">
    <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-primary-600); background: rgba(var(--color-primary-500-rgb), 0.1);">
      <span style="color: var(--color-primary-400); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Window Title</span>
    </div>
    <div style="padding: 1.5rem;">
      <p style="color: var(--color-text-body); font-size: 13px; margin: 0;">Content lives inside the frame. The border draws your eye. The glow reinforces focus.</p>
    </div>
  </div>
</div>

On a dark background, a single bordered window immediately captures attention. The frame creates a boundary — inside is content that matters, outside is rest.

But what happens when you need **multiple windows**? They compete for attention. Some content is more important than others. You need **hierarchy**.

---

## See for yourself


<div style="display: flex; gap: 1rem; margin: 2rem 0; min-height: 280px; position: relative;">
  <!-- Decorative: Corner brackets and hex data -->
  <div style="position: absolute; top: 0; left: 0; width: 16px; height: 16px; border-left: 1px solid rgba(var(--color-primary-500-rgb), 0.3); border-top: 1px solid rgba(var(--color-primary-500-rgb), 0.3);"></div>
  <div style="position: absolute; top: 0; right: 0; width: 16px; height: 16px; border-right: 1px solid rgba(var(--color-primary-500-rgb), 0.3); border-top: 1px solid rgba(var(--color-primary-500-rgb), 0.3);"></div>
  <div style="position: absolute; bottom: 0; left: 0; width: 16px; height: 16px; border-left: 1px solid rgba(var(--color-primary-500-rgb), 0.3); border-bottom: 1px solid rgba(var(--color-primary-500-rgb), 0.3);"></div>
  <div style="position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; border-right: 1px solid rgba(var(--color-primary-500-rgb), 0.3); border-bottom: 1px solid rgba(var(--color-primary-500-rgb), 0.3);"></div>

  <!-- Secondary: Navigation sidebar -->
  <div style="width: 140px; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.25); display: flex; flex-direction: column; flex-shrink: 0;">
    <div style="padding: 0.75rem; border-bottom: 1px solid rgba(var(--color-primary-500-rgb), 0.3);">
      <span style="color: var(--color-primary-500); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Navigation</span>
    </div>
    <div style="padding: 0.5rem;">
      <div style="padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid transparent; color: var(--color-primary-400); font-size: 12px; cursor: pointer;">Dashboard</div>
      <div style="padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--color-primary-600); background: rgba(var(--color-primary-500-rgb), 0.1); color: var(--color-primary-400); font-size: 12px; cursor: pointer;">Settings</div>
      <div style="padding: 0.5rem; border: 1px solid transparent; color: var(--color-primary-400); font-size: 12px; cursor: pointer;">Profile</div>
    </div>
    <!-- Decorative hex data at bottom of nav -->
    <div style="margin-top: auto; padding: 0.5rem; border-top: 1px solid rgba(var(--color-primary-500-rgb), 0.2);">
      <div style="font-size: 9px; color: var(--color-text-faint); opacity: 0.6; font-family: monospace; line-height: 1.4;">0xA7F3 0x9B2E<br>0x3D1C 0xF8A4</div>
    </div>
  </div>

  <!-- Primary: Main window -->
  <div style="flex: 1; border: 2px solid var(--color-primary-500); box-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.3); display: flex; flex-direction: column;">
    <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-primary-600); background: rgba(var(--color-primary-500-rgb), 0.1); display: flex; align-items: center; gap: 0.5rem;">
      <span style="color: var(--color-primary-400); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Main Window</span>
      <span style="margin-left: auto; font-size: 10px; color: var(--color-text-muted);">[PRIMARY]</span>
    </div>
    <div style="padding: 1.25rem; flex: 1;">
      <p style="color: var(--color-text-body); font-size: 13px; margin-bottom: 1rem;">This is where the main action happens. The thick border and glow draw the user's attention here first.</p>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="plaza-btn plaza-btn--sm">SAVE</button>
        <button class="plaza-btn plaza-btn--secondary plaza-btn--sm">CANCEL</button>
      </div>
    </div>
  </div>

  <!-- Decorative: Side panel with scrolling data -->
  <div style="width: 100px; border: 1px solid rgba(var(--color-primary-500-rgb), 0.25); background: rgba(var(--color-bg-overlay-rgb), 0.15); padding: 0.5rem; display: flex; flex-direction: column; flex-shrink: 0;">
    <div style="font-size: 9px; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; opacity: 0.7;">System Log</div>
    <div style="font-size: 9px; color: var(--color-text-faint); font-family: monospace; line-height: 1.6; opacity: 0.5;">
      [OK] init<br>
      [OK] load<br>
      [OK] sync<br>
      [--] idle<br>
      [--] wait<br>
      [OK] ping
    </div>
  </div>
</div>

<div style="display: flex; gap: 2rem; font-size: 11px; color: var(--color-text-muted); margin-bottom: 1rem; flex-wrap: wrap;">
  <span><span style="display: inline-block; width: 12px; height: 12px; border: 2px solid var(--color-primary-500); vertical-align: middle; margin-right: 4px;"></span> Primary</span>
  <span><span style="display: inline-block; width: 12px; height: 12px; border: 1px solid var(--color-primary-600); vertical-align: middle; margin-right: 4px;"></span> Secondary</span>
  <span><span style="display: inline-block; width: 12px; height: 12px; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); vertical-align: middle; margin-right: 4px;"></span> Decorative</span>
</div>

**Notice how:**
- Your eye goes to the **main window** first (Primary)
- The **navigation** is clearly visible but doesn't compete (Secondary)
- The **corner brackets and hex data** add atmosphere without demanding attention (Decorative)


---

## The Rule

> **Primary** — demands action (thick borders, glow)
> **Secondary** — visible, may interact (solid borders, subtle glow)
> **Decorative** — atmosphere only (translucent borders, no glow)

---

## The Three Levels

<div style="display: flex; gap: 1.5rem; margin: 2rem 0; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 180px; text-align: center;">
    <div style="padding: 1.25rem; border: 2px solid var(--color-primary-500); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.4); background: rgba(var(--color-bg-overlay-rgb), 0.4);">
      <span style="color: var(--color-primary-400); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Primary</span>
    </div>
    <p style="font-size: 11px; color: var(--color-text-muted); margin-top: 0.5rem;">2px solid • glow • 100%</p>
  </div>
  <div style="flex: 1; min-width: 180px; text-align: center;">
    <div style="padding: 1.25rem; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.3);">
      <span style="color: var(--color-primary-500); text-transform: uppercase; letter-spacing: 0.1em;">Secondary</span>
    </div>
    <p style="font-size: 11px; color: var(--color-text-muted); margin-top: 0.5rem;">1px solid • subtle glow • 100%</p>
  </div>
  <div style="flex: 1; min-width: 180px; text-align: center;">
    <div style="padding: 1.25rem; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); background: rgba(var(--color-bg-overlay-rgb), 0.15);">
      <span style="color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7;">Decorative</span>
    </div>
    <p style="font-size: 11px; color: var(--color-text-muted); margin-top: 0.5rem;">1px translucent • no glow • 40-75%</p>
  </div>
</div>

---


---

## Primary Elements

**These demand action. Users click, tap, or type into them.**

<div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 2px solid var(--color-primary-500);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Border</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">2px solid</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 2px solid var(--color-primary-500); box-shadow: 0 0 12px rgba(var(--color-primary-500-rgb), 0.4);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Glow</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">box-shadow with color</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 2px solid var(--color-primary-400); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.6); background: rgba(var(--color-primary-500-rgb), 0.1);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Hover</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">Brightens, glow intensifies</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; background: var(--color-primary-500);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Opacity</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">100%</span>
  </div>
</div>

**Examples:** *(hover to see effects)*

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; align-items: center;">
  <button class="plaza-btn plaza-btn--sm">PRIMARY BTN</button>
  <input type="text" class="plaza-input" placeholder="Text input..." style="width: 160px;">
  <button class="plaza-btn plaza-btn--accent plaza-btn--sm">ACTION</button>
</div>

**Use for:**
- Primary action buttons
- Form inputs (text, select, checkbox)
- Main window frames
- Modal dialogs
- Anything that invites immediate interaction

**Characteristics:**
- CRT scanlines appear on hover
- Borders are solid, not translucent
- Colors at full saturation
- Shadows pulse or breathe subtly

---

## Secondary Elements

**These are visible and interactive, but don't demand immediate attention.**

<div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid var(--color-primary-600);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Border</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">1px solid</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.2);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Glow</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">None or very subtle</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid var(--color-primary-500); background: rgba(var(--color-primary-500-rgb), 0.1);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Hover</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">Border brightens, subtle highlight</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; background: var(--color-primary-500);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Opacity</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">100%</span>
  </div>
</div>

**Examples:** *(hover to see effects)*

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; align-items: center;">
  <button class="plaza-btn plaza-btn--secondary plaza-btn--sm">NAV ITEM</button>
  <div style="padding: 0.5rem 0.75rem; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.2);">
    <span style="color: var(--color-primary-500); font-size: 12px;">Side Panel</span>
  </div>
  <div style="padding: 0.5rem 0.75rem; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.2);">
    <span style="color: var(--color-primary-500); font-size: 12px;">Table Row</span>
  </div>
</div>

**Use for:**
- Navigation items
- Secondary/cancel buttons
- Table rows and cells
- Side panels and drawers
- Tabs (inactive)
- List items that can be selected

**Characteristics:**
- Solid borders (not translucent) but thinner
- Clear text at full opacity
- Hover shows intent without overwhelming
- Can receive focus and be interacted with

---

## Decorative Elements

**These create atmosphere. Users glance at them, not interact with them.**

<div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Border</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">1px translucent (30-50%)</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); background: rgba(var(--color-bg-overlay-rgb), 0.15);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Glow</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">None</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); background: rgba(var(--color-bg-overlay-rgb), 0.15);"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Hover</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">None (not interactive)</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; background: var(--color-primary-500); opacity: 0.5;"></div>
    <span style="color: var(--color-text-body); font-size: 13px; min-width: 120px;">Opacity</span>
    <span style="color: var(--color-text-muted); font-size: 13px;">40-75%</span>
  </div>
</div>

**Examples:**

<div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 1rem 0; align-items: center;">
  <div style="padding: 0.5rem; border: 1px solid rgba(var(--color-primary-500-rgb), 0.25); background: rgba(var(--color-bg-overlay-rgb), 0.1);">
    <span style="color: var(--color-text-faint); font-size: 10px; font-family: monospace; opacity: 0.6;">0xA7F3 0x9B2E</span>
  </div>
  <div style="display: flex; gap: 0.25rem;">
    <div style="width: 16px; height: 16px; border-left: 1px solid rgba(var(--color-primary-500-rgb), 0.35); border-top: 1px solid rgba(var(--color-primary-500-rgb), 0.35);"></div>
    <div style="width: 16px; height: 16px; border-right: 1px solid rgba(var(--color-primary-500-rgb), 0.35); border-top: 1px solid rgba(var(--color-primary-500-rgb), 0.35);"></div>
  </div>
  <div style="font-size: 10px; color: var(--color-text-faint); font-family: monospace; opacity: 0.5; line-height: 1.4;">[OK] sys_init<br>[--] waiting</div>
</div>

**Use for:**
- Corner brackets and frame accents
- Scrolling hex data displays
- Background grid patterns
- Ambient status indicators
- Particle effects
- Any "flavor text" that adds to the vibe

**Characteristics:**
- Borders use `rgba()` for transparency
- Text at reduced opacity
- Animation is slow and ambient (if any)
- Content can be nonsense (hex data) — it's for mood
- Never interactive

---

## Shapes & Containers

**All Plaza elements use sharp 90-degree corners. No `border-radius` ever.**

### The Shape Rule

> Every box is a rectangle with hard edges. This creates the terminal/CRT aesthetic.

The only exception is `--radius-full` (9999px) for circular badges or pill shapes, used sparingly.

### Container Tiers

Just like elements, containers (windows, panels, frames) follow the three-tier system:

<div style="display: flex; gap: 1rem; margin: 2rem 0; flex-wrap: wrap;">
  <!-- Primary Window -->
  <div style="flex: 1; min-width: 200px;">
    <div style="border: 2px solid var(--color-primary-500); box-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.3);">
      <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-primary-600); background: rgba(var(--color-primary-500-rgb), 0.1);">
        <span style="color: var(--color-primary-400); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Primary Window</span>
      </div>
      <div style="padding: 1rem;">
        <p style="color: var(--color-text-body); font-size: 12px; margin: 0;">Main focus area. Modal dialogs, active forms, main content window.</p>
      </div>
    </div>
    <p style="font-size: 10px; color: var(--color-text-muted); margin-top: 0.5rem; text-align: center;">2px border • glow • `.plaza-window--primary`</p>
  </div>

  <!-- Secondary Window -->
  <div style="flex: 1; min-width: 200px;">
    <div style="border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.25);">
      <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(var(--color-primary-500-rgb), 0.3);">
        <span style="color: var(--color-primary-500); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Secondary Window</span>
      </div>
      <div style="padding: 1rem;">
        <p style="color: var(--color-text-body); font-size: 12px; margin: 0;">Supporting content. Side panels, navigation, tables, inactive tabs.</p>
      </div>
    </div>
    <p style="font-size: 10px; color: var(--color-text-muted); margin-top: 0.5rem; text-align: center;">1px solid border • `.plaza-window`</p>
  </div>

  <!-- Decorative Window -->
  <div style="flex: 1; min-width: 200px;">
    <div style="border: 1px solid rgba(var(--color-primary-500-rgb), 0.25); background: rgba(var(--color-bg-overlay-rgb), 0.15);">
      <div style="padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(var(--color-primary-500-rgb), 0.15);">
        <span style="color: var(--color-text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7;">Decorative Window</span>
      </div>
      <div style="padding: 1rem;">
        <p style="color: var(--color-text-faint); font-size: 12px; margin: 0; opacity: 0.7;">Atmosphere only. Status logs, hex displays, ambient data.</p>
      </div>
    </div>
    <p style="font-size: 10px; color: var(--color-text-muted); margin-top: 0.5rem; text-align: center;">1px translucent • `.plaza-window--decorative`</p>
  </div>
</div>

### Box Anatomy

Most containers share a common structure:

<div style="margin: 1.5rem 0; max-width: 400px;">
  <div style="border: 2px solid var(--color-primary-500); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.2);">
    <!-- Header -->
    <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-primary-600); background: rgba(var(--color-primary-500-rgb), 0.1); display: flex; align-items: center;">
      <span style="color: var(--color-primary-400); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Header Bar</span>
      <span style="margin-left: auto; color: var(--color-text-muted); font-size: 10px;">title, controls</span>
    </div>
    <!-- Content -->
    <div style="padding: 1.5rem; min-height: 80px; display: flex; align-items: center; justify-content: center;">
      <span style="color: var(--color-text-muted); font-size: 12px;">Content Area</span>
    </div>
    <!-- Footer (optional) -->
    <div style="padding: 0.75rem 1rem; border-top: 1px solid var(--color-primary-600); background: rgba(var(--color-primary-500-rgb), 0.05); display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
      <span style="color: var(--color-text-muted); font-size: 10px; margin-right: auto;">Footer (optional)</span>
      <button class="plaza-btn plaza-btn--secondary plaza-btn--sm">CANCEL</button>
      <button class="plaza-btn plaza-btn--sm">OK</button>
    </div>
  </div>
</div>

| Part | Purpose | Border |
|------|---------|--------|
| **Header** | Title, window controls | Bottom border (1px) |
| **Content** | Main body | None |
| **Footer** | Actions, status | Top border (1px) |

### Nesting Rules

Containers can nest, but always **from higher to lower tier**:

<div style="margin: 1.5rem 0; padding: 1rem; border: 2px solid var(--color-primary-500); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.2);">
  <div style="font-size: 10px; color: var(--color-primary-400); text-transform: uppercase; margin-bottom: 0.75rem;">Primary Window</div>

  <div style="display: flex; gap: 0.75rem;">
    <!-- Secondary panel inside primary -->
    <div style="flex: 1; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.2); padding: 0.75rem;">
      <div style="font-size: 9px; color: var(--color-primary-500); text-transform: uppercase; margin-bottom: 0.5rem;">Secondary Panel</div>

      <!-- Decorative inside secondary -->
      <div style="border: 1px solid rgba(var(--color-primary-500-rgb), 0.25); background: rgba(var(--color-bg-overlay-rgb), 0.1); padding: 0.5rem;">
        <div style="font-size: 8px; color: var(--color-text-faint); opacity: 0.6; font-family: monospace;">0xF3A2 0x9B1C</div>
      </div>
    </div>

    <!-- Another secondary panel -->
    <div style="flex: 1; border: 1px solid var(--color-primary-600); background: rgba(var(--color-bg-overlay-rgb), 0.2); padding: 0.75rem;">
      <div style="font-size: 9px; color: var(--color-primary-500); text-transform: uppercase; margin-bottom: 0.5rem;">Content Area</div>
      <div style="font-size: 11px; color: var(--color-text-body);">Main content goes here.</div>
    </div>
  </div>
</div>

**Valid nesting:**
- Primary → Secondary → Decorative ✓
- Primary → Decorative ✓
- Secondary → Decorative ✓

**Invalid nesting:**
- Decorative → Primary ✗ (decorative can't contain primary)
- Secondary → Primary ✗ (secondary can't contain primary)

---

## Contrast & Readability

**Low contrast is intentional for decorative elements — but everything must remain visible.**

### Text Contrast Tokens

<div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <span style="color: var(--color-text-heading); font-size: 13px; font-weight: 600;">Aa</span>
    </div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-text-heading</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Titles — Highest contrast</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <span style="color: var(--color-text-body); font-size: 13px;">Aa</span>
    </div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-text-body</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Main content — Fully readable</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <span style="color: var(--color-text-muted); font-size: 13px;">Aa</span>
    </div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-text-muted</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Secondary info — Clearly visible</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <span style="color: var(--color-text-faint); font-size: 13px;">Aa</span>
    </div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-text-faint</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Decorative — Low but perceptible</span>
  </div>
</div>

**Rule:** Even `--color-text-faint` must be visible. Decorative doesn't mean invisible.

### Border Contrast Tokens

<div style="display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0;">
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 2px solid var(--color-border-strong);"></div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-border-strong</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Primary elements</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid var(--color-border-default);"></div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-border-default</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Secondary elements</span>
  </div>
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="width: 60px; height: 24px; border: 1px solid var(--color-border-muted);"></div>
    <code style="color: var(--color-text-body); font-size: 13px; min-width: 180px;">--color-border-muted</code>
    <span style="color: var(--color-text-muted); font-size: 13px;">Decorative elements</span>
  </div>
</div>

---

## Visual Checklist

Before adding an element, ask:

1. **Does this invite immediate action?**
   - Yes → **Primary** (2px border, glow, full effects)

2. **Will users interact with this, but it's not the main focus?**
   - Yes → **Secondary** (1px solid border, subtle hover)

3. **Is this purely for atmosphere?**
   - Yes → **Decorative** (1px translucent border, no interaction)

---

## Anti-Patterns

<div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin: 1.5rem 0;">
  <div style="text-align: center;">
    <div style="padding: 1rem; border: 2px solid var(--color-primary-500); box-shadow: 0 0 15px rgba(var(--color-primary-500-rgb), 0.5); background: rgba(var(--color-bg-overlay-rgb), 0.2);">
      <span style="color: var(--color-text-faint); font-size: 10px; font-family: monospace; opacity: 0.6;">0xDEAD</span>
    </div>
    <div style="font-size: 11px; color: var(--color-error); margin-top: 6px;">Glowing decorative</div>
  </div>
  <div style="text-align: center;">
    <div style="padding: 0.5rem 1rem; border: 1px solid rgba(var(--color-primary-500-rgb), 0.3); background: transparent;">
      <span style="color: var(--color-primary-400); font-size: 12px; font-family: monospace;">SUBMIT</span>
    </div>
    <div style="font-size: 11px; color: var(--color-error); margin-top: 6px;">Faint primary button</div>
  </div>
  <div style="text-align: center;">
    <div style="padding: 0.5rem 1rem; border: 2px solid var(--color-primary-500); border-radius: 8px; background: transparent;">
      <span style="color: var(--color-primary-400); font-size: 12px; font-family: monospace;">ROUND</span>
    </div>
    <div style="font-size: 11px; color: var(--color-error); margin-top: 6px;">Rounded corners</div>
  </div>
</div>

**Don't do this:**
- Thick glowing borders on decorative elements (steals attention)
- Faint borders on primary buttons (looks broken)
- Everything at 100% opacity (no depth)
- Everything with glow effects (overwhelming)
- Mixing rounded corners anywhere (breaks the aesthetic)

**The goal:** Clear visual hierarchy where the eye naturally flows from Primary → Secondary → Decorative.
