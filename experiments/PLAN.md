# Plaza Design Kit - Demo Research Platform

## Purpose

A research and development platform to explore how the Plaza design system works across many different UI contexts. Each demo helps refine the design approach by testing components in realistic scenarios.

---

## Architecture

**Single React app** with path-based routing:
- `/` - Landing page (current)
- `/demos/gallery` - Component Gallery
- `/demos/dashboard` - System Dashboard
- `/demos/chat` - Chat Interface
- `/demos/forum` - Forum/HackerNews
- `/demos/profile` - User Profile
- `/demos/settings` - Settings Panel
- `/demos/tasks` - Task Manager
- `/demos/data` - Tables & Graphs
- `/demos/email` - Email Client
- `/demos/files` - File Explorer
- `/demos/blocks` - Block Explorer
- `/demos/calendar` - Calendar View
- `/demos/blog` - Blog
- `/demos/desktop` - Windows Desktop
- `/demos/console` - System Console

---

## Complete Demo Catalog

### 1. System Dashboard
**Path:** `/demos/dashboard`
**Context:** Monitoring / Operations

A hacker's monitoring dashboard with multiple data panels.

**Showcases:**
- Multiple `.plaza-window` instances tiled/overlapping
- `.plaza-side-panel` with telemetry blocks
- Real-time `.plaza-hex-scroll` streams
- Status indicators with `.text-ambient-cyan`, `.text-dim-red`
- Network graph/nodes visualization

**Design Questions:**
- How do multiple panels compose together?
- Density vs. readability tradeoffs?
- Animation performance with many live elements?

---

### 2. User Profile
**Path:** `/demos/profile`
**Context:** Social / Identity

Terminal-style user profile from a decentralized network.

**Showcases:**
- Profile card with `.plaza-window` frame
- Bio text, custom links with `.route-link`
- Follow/Tip buttons with `.plaza-btn` variants
- User's posts feed with voting widgets
- Stats display (followers, following, posts)
- `.evolution-text` for username hover effect

**Design Questions:**
- How to display identity information?
- Action button placement and hierarchy?
- Social stats presentation?

---

### 3. Chat Interface
**Path:** `/demos/chat`
**Context:** Communication / Real-time

Terminal chat room or DM conversation view.

**Showcases:**
- Message feed with timestamps
- `.plaza-window` with header showing channel info
- Footer terminal input area
- User list panel on side
- `.text-ambient-*` for system messages
- Message cards with user mentions

**Design Questions:**
- Message spacing and readability?
- Input field patterns?
- User presence indicators?

---

### 4. Forum / HackerNews
**Path:** `/demos/forum`
**Context:** Community / Discussion

Threaded discussion board with voting.

**Showcases:**
- Post list with voting, comments count
- Nested comment threads (indentation)
- Vote buttons (up/down)
- Time ago formatting
- Author links
- "More" pagination

**Design Questions:**
- Voting UI patterns?
- Comment nesting depth limits?
- Thread density and scanability?

---

### 5. Settings Panel
**Path:** `/demos/settings`
**Context:** Configuration / Forms

Configuration interface with various form elements.

**Showcases:**
- Form inputs styled for terminal aesthetic
- Toggle switches, radio groups, dropdowns
- `.plaza-btn--secondary` for cancel actions
- `.plaza-btn--tease` for "coming soon" features
- Section headers with `.plaza-side-panel__header`
- Validation states (error, success)

**Design Questions:**
- Form input styling?
- Validation feedback patterns?
- Button placement conventions?

---

### 6. Modal Showcase
**Path:** `/demos/modals`
**Context:** Component Library

Gallery of different modal dialog types.

**Showcases:**
- Confirmation modal
- Form modal (input fields)
- Warning/danger modal (`.text-dim-red`)
- Info/help modal
- Multi-step wizard modal
- Bottom sheet (mobile style)

**Design Questions:**
- Modal sizing and positioning?
- Overlay opacity?
- Animation patterns?

---

### 7. Data Table / Log Viewer
**Path:** `/demos/data`
**Context:** Data / Analytics

Network nodes list or transaction log.

**Showcases:**
- Table with sortable columns
- Row hover states
- Status indicators (online/offline/syncing)
- Pagination or infinite scroll
- Filter/search input
- `.plaza-hex-scroll` for live log stream

**Design Questions:**
- Column alignment patterns?
- Sortable header styling?
- Row hover states?

---

### 8. Login / Wallet Connect
**Path:** `/demos/auth`
**Context:** Authentication

Multi-step authentication or wallet connection.

**Showcases:**
- Step indicator (1 of 3, etc.)
- Wallet choice buttons (`.plaza-btn`)
- Address display with copy button
- Status messages during connection
- `.crt-flicker` for "connecting..." state
- Success/error feedback

**Design Questions:**
- Step indicator styling?
- Loading/connecting states?
- Error message presentation?

---

### 9. Command Terminal
**Path:** `/demos/console`
**Context:** Interactive CLI

Interactive command-line interface.

**Showcases:**
- Command input with blinking `.terminal-cursor`
- Output log with syntax highlighting
- Command history navigation
- Auto-complete suggestions
- System response messages
- ASCII art banner

**Design Questions:**
- Output formatting?
- Command prompt styling?
- History navigation UX?

---

### 10. Component Gallery
**Path:** `/demos/gallery`
**Context:** Documentation

Visual showcase of all components.

**Showcases:**
- All button variants
- Window with all parts (header, footer, brackets)
- Panel blocks and dividers
- All effect classes demonstrated
- Color palette display
- Theme switcher with live preview

**Purpose:** Living documentation and reference for the design kit.

---

### 11. Task Manager
**Path:** `/demos/tasks`
**Context:** Process Management

Terminal-style process/task viewer.

**Showcases:**
- Process list with PID, name, CPU, memory columns
- Status indicators (running, stopped, zombie)
- Kill/restart action buttons
- Real-time updating values
- Sorting and filtering

**Design Questions:**
- Status badge styling?
- Action button placement in rows?
- Real-time update performance?

---

### 12. Windows 3.1 Desktop
**Path:** `/demos/desktop`
**Context:** Retro / Experimental

Classic desktop with draggable/overlapping windows.

**Showcases:**
- Multiple `.plaza-window` instances
- Window minimize/maximize/close
- Taskbar at bottom
- Desktop icons
- Window z-order management

**Design Questions:**
- Window control button styling?
- Dragging and resize handles?
- Taskbar item display?

---

### 13. Tables & Graphs
**Path:** `/demos/charts`
**Context:** Data Visualization

Data visualization components.

**Showcases:**
- Sortable data table with headers
- Line graph (ASCII or SVG)
- Bar chart
- Sparklines
- Progress bars
- Statistics cards

**Design Questions:**
- Chart color schemes per theme?
- ASCII vs SVG approach?
- Number formatting patterns?

---

### 14. Email Client
**Path:** `/demos/email`
**Context:** Minimalist Productivity

Simple inbox interface.

**Showcases:**
- Email list (sender, subject, preview, time)
- Read/unread indicators
- Compose form (To, Subject, Body)
- Folder navigation (Inbox, Sent, Drafts)
- Search input

**Design Questions:**
- List item density?
- Read/unread visual distinction?
- Compose form layout?

---

### 15. Blog
**Path:** `/demos/blog`
**Context:** Content / Reading

Article/post reading interface.

**Showcases:**
- Article title, author, date
- Long-form text styling
- Code blocks with syntax highlighting
- Blockquotes
- Related posts sidebar
- Tags/categories

**Design Questions:**
- Typography for long-form reading?
- Code block styling?
- Quote styling?

---

### 16. Calendar View
**Path:** `/demos/calendar`
**Context:** Temporal / Planning

Month/week/day calendar interface.

**Showcases:**
- Month grid with days
- Event items on dates
- Today indicator
- Navigation (prev/next month)
- Event detail tooltip

**Design Questions:**
- Grid cell sizing?
- Event overflow handling?
- Today highlight styling?

---

### 17. File Explorer
**Path:** `/demos/files`
**Context:** Filesystem / Navigation

Directory tree and file browser.

**Showcases:**
- Tree view with expand/collapse
- File list (name, size, modified)
- Breadcrumb navigation
- File type icons (text-based: [], {}, <>)
- Context menu (right-click)

**Design Questions:**
- Tree indentation styling?
- File icon representation?
- Breadcrumb separator?

---

### 18. Block Explorer
**Path:** `/demos/blocks`
**Context:** Blockchain / Web3

Blockchain transaction/block viewer.

**Showcases:**
- Block list with height, hash, time
- Transaction details
- Address display with copy
- Hash truncation patterns
- Status badges (confirmed, pending)
- Gas/fee display

**Design Questions:**
- Hash truncation format?
- Status badge colors?
- Large number formatting?

---

## File Structure

```
demo-react/src/
├── App.tsx                     # Main app with React Router
├── main.tsx                    # Entry point
├── components/
│   ├── landing/                # Current landing page
│   │   ├── LandingPage.tsx
│   │   ├── GridBackground.tsx
│   │   ├── WindowFrame.tsx
│   │   ├── SidePanel.tsx
│   │   ├── CenterContent.tsx
│   │   └── Particles.tsx
│   ├── demos/                  # Demo pages
│   │   ├── GalleryDemo.tsx
│   │   ├── DashboardDemo.tsx
│   │   ├── ChatDemo.tsx
│   │   ├── ForumDemo.tsx
│   │   ├── ProfileDemo.tsx
│   │   ├── SettingsDemo.tsx
│   │   ├── TasksDemo.tsx
│   │   ├── DataDemo.tsx
│   │   ├── EmailDemo.tsx
│   │   ├── FilesDemo.tsx
│   │   ├── BlocksDemo.tsx
│   │   ├── CalendarDemo.tsx
│   │   ├── BlogDemo.tsx
│   │   ├── DesktopDemo.tsx
│   │   └── ConsoleDemo.tsx
│   └── shared/                 # Shared components
│       ├── DemoLayout.tsx      # Common demo wrapper
│       ├── DemoNav.tsx         # Navigation sidebar
│       └── ...                 # Reusable patterns
├── data/
│   └── mock/                   # Mock data generators
├── plaza.ts                    # Theme + data utilities
└── plaza-core/                 # CSS design system
```

---

## Implementation Phases

### Phase 1 - Foundation
**Goal:** Set up routing and navigation infrastructure

**Tasks:**
1. Install React Router (`react-router-dom`)
2. Update App.tsx with route definitions
3. Create `DemoLayout.tsx` - common wrapper with nav and theme toggle
4. Create `DemoNav.tsx` - sidebar/menu to switch between demos
5. Move current landing page to `/` route
6. Verify routing works with all paths

**Deliverables:**
- Working navigation between landing and demo routes
- Placeholder pages for each demo path

---

### Phase 2 - Core Demos
**Goal:** Build demos with highest design coverage

**Tasks:**
1. **Component Gallery** (`/demos/gallery`)
   - All button variants displayed
   - Window component showcase
   - Panel and effects demonstration
   - Color palette for each theme
   - Interactive theme switcher

2. **System Dashboard** (`/demos/dashboard`)
   - 3-4 tiled window panels
   - Telemetry data blocks
   - Hex scroll streams
   - Status indicators
   - Mock data generators

3. **Chat Interface** (`/demos/chat`)
   - Message list component
   - Message input with send button
   - User list sidebar
   - Channel header
   - Mock message data

4. **Forum/HackerNews** (`/demos/forum`)
   - Post list with voting
   - Nested comment thread
   - Vote button component
   - Author links
   - Mock post/comment data

**Deliverables:**
- 4 fully functional demo pages
- Identified shared patterns extracted to `/shared`
- Design system gaps identified

---

### Phase 3 - Extended Demos
**Goal:** Cover additional UI patterns

**Tasks:**
1. User Profile (`/demos/profile`)
2. Settings Panel (`/demos/settings`)
3. Task Manager (`/demos/tasks`)
4. Tables & Graphs (`/demos/data`)

**Deliverables:**
- 4 more demo pages
- Form component patterns
- Data visualization patterns

---

### Phase 4 - Specialized Demos
**Goal:** Explore edge cases and specialized UIs

**Tasks:**
1. Email Client (`/demos/email`)
2. File Explorer (`/demos/files`)
3. Block Explorer (`/demos/blocks`)
4. Calendar View (`/demos/calendar`)
5. Blog (`/demos/blog`)
6. Windows Desktop (`/demos/desktop`)
7. System Console (`/demos/console`)

**Deliverables:**
- Complete demo platform
- All design patterns documented
- Design system refinements

---

## Current Cycle: Phase 1 + Phase 2

**Scope:** Foundation + 4 Core Demos

**Stopping Point:** After Phase 2 completion, pause for human feedback to:
- Review design decisions
- Identify needed CSS additions
- Prioritize Phase 3+ demos
- Refine shared component patterns

---

## Design Research Goals

Each demo answers specific questions:

| Demo | Research Questions |
|------|-------------------|
| Gallery | What components exist? What's missing? |
| Dashboard | Multi-panel composition? Animation performance? |
| Chat | Message spacing? Input patterns? User indicators? |
| Forum | Voting UI? Nesting depth? Thread density? |
| Profile | Identity display? Action hierarchy? Stats presentation? |
| Settings | Input styling? Validation? Button placement? |
| Tasks | Status badges? Row actions? Real-time updates? |
| Data | Tables? Charts? Number formatting? |
| Email | List density? Read/unread states? Compose layout? |
| Files | Tree styling? Icons? Breadcrumbs? |
| Blocks | Hash display? Status colors? Large numbers? |
| Calendar | Grid sizing? Event overflow? Today highlight? |
| Blog | Long-form typography? Code blocks? Quotes? |
| Desktop | Window controls? Dragging? Z-order? |
| Console | Output formatting? Prompt styling? History UX? |

---

## Notes

- All demos use mock/generated data (no real backend)
- Theme switching works globally across all demos
- Responsive design tested at mobile/tablet/desktop breakpoints
- SSG (static site generation) can be added later if needed
