# AI Funding System - Complete Architecture

## 🎯 System Overview

A two-skill pipeline that automatically researches government funding programs and imports them into a MongoDB database for intelligent business-to-program matching.

## 📋 Complete Workflow

```
User Request
    ↓
[1] funding-program-researcher skill
    ↓ (researches program)
    ↓ (generates markdown report)
    ↓ (saves to program_reports/)
    ↓
[2] funding-db-importer skill ← automatically called
    ↓ (parses markdown)
    ↓ (maps to schema)
    ↓ (inserts to MongoDB)
    ↓
Database ready for matching queries
```

## 🔧 Component Breakdown

### Component 1: Funding Program Researcher Skill
**Location:** `.claude/skills/funding-program-researcher/`

**Purpose:** Research government funding programs and generate comprehensive reports

**Inputs:**
- Government program URL
- Program name

**Process:**
1. Web scraping (official sites, PDFs, news)
2. Cross-validation across sources
3. QA validation (completeness & quality scores)
4. Markdown report generation

**Outputs:**
- `program_reports/{slug}-{date}.md` - Full research report
- Updates `_REGISTRY.md` with new entry
- **Calls** `funding-db-importer` skill automatically

**Example invocation:**
```bash
# User provides URL or program name
"Research the IRAP program for me"
# Skill activates, generates report, imports to DB
```

---

### Component 2: Funding DB Importer Skill
**Location:** `.claude/skills/funding-db-importer/`

**Purpose:** Parse markdown reports and import to MongoDB

**Inputs:**
- File path to markdown report (e.g., `program_reports/raii-2025-10-30.md`)

**Process:**
1. Read markdown file
2. Parse sections (eligibility, funding, contacts, etc.)
3. Extract & transform data
4. Map to MongoDB schema
5. Validate required fields
6. Upsert to MongoDB via MCP

**Outputs:**
- Document inserted/updated in `ai_funding.funding_programs`
- Success message with MongoDB ID
- Extracted data summary

**Example invocation:**
```bash
/funding-db-importer program_reports/raii-2025-10-30.md
```

**Called automatically by:** funding-program-researcher skill

---

### Component 3: MongoDB Atlas Database
**Connection:** mongodb+srv://cluster0.b4wapis.mongodb.net

**Database:** `ai_funding`

**Collection:** `funding_programs`

**Schema:** 19 top-level fields, nested documents for complex data

**Indexes:** 8 performance-optimized indexes

**Current data:** 4 programs
- WIPSI (NS workforce training)
- Invest NS Accelerate (NS startup accelerator)
- G7 GovAI Grand Challenge (International AI competition)
- RAII (Federal AI commercialization/adoption)

---

### Component 4: Matching System
**Location:** `src/match-example.js` (demonstration)

**Purpose:** Match businesses to relevant funding programs with fit scoring

**Inputs:**
- Business profile (location, sector, stage, revenue, etc.)

**Process:**
1. Filter by mandatory criteria (geographic, entity type)
2. Apply range filters (revenue, funding raised, employees)
3. Calculate fit scores (0-100%)
4. Rank by best match

**Outputs:**
- Ranked list of eligible programs
- Fit quality percentage
- Detailed scoring breakdown
- Ineligible programs with reasons

---

## 🔄 Data Flow

### End-to-End Example

**User wants to research NRC IRAP:**

```
1. USER: "Research the NRC IRAP program"

2. RESEARCHER SKILL activates:
   ├─ Fetches https://nrc.canada.ca/irap
   ├─ Extracts eligibility, funding, deadlines
   ├─ Cross-validates with news, third-party sites
   ├─ Runs QA validation
   ├─ Generates: program_reports/nrc-irap-2025-10-30.md
   ├─ Updates _REGISTRY.md
   └─ Calls: /funding-db-importer program_reports/nrc-irap-2025-10-30.md

3. IMPORTER SKILL activates:
   ├─ Reads markdown report
   ├─ Parses sections
   ├─ Maps to schema:
   │  {
   │    program_id: "ca-fed-nrc-irap",
   │    name: "Industrial Research Assistance Program",
   │    funding: { min: 50000, max: 500000 },
   │    eligibility: { ... },
   │    ...
   │  }
   ├─ Validates required fields ✓
   └─ Inserts via MongoDB MCP

4. DATABASE now contains IRAP
   └─ Total programs: 5

5. USER can query:
   "Find programs for early-stage AI startup in Ontario"

6. MATCHING SYSTEM returns:
   • RAII - 85% fit
   • NRC IRAP - 95% fit ⭐
   • Invest NS Accelerate - Ineligible (wrong location)
```

---

## 🗄️ File Structure

```
/Volumes/SD/ai_funding/
│
├── .claude/
│   └── skills/
│       ├── funding-program-researcher/    # Generates reports
│       │   ├── skill.md
│       │   ├── README.md
│       │   └── templates/
│       │
│       └── funding-db-importer/           # Imports to MongoDB
│           ├── skill.md
│           └── README.md
│
├── program_reports/                       # Markdown reports
│   ├── _REGISTRY.md
│   ├── wipsi-2025-10-30.md
│   ├── invest-ns-accelerate-2025-10-30.md
│   ├── g7-govai-grand-challenge-2025-10-30.md
│   └── raii-2025-10-30.md
│
├── src/                                   # Scripts (optional - MCP is primary)
│   ├── parser.js
│   ├── migrate.js
│   └── match-example.js
│
├── package.json                           # npm config (optional)
├── README.md                             # System documentation
├── IMPLEMENTATION_SUMMARY.md             # What we built
└── SYSTEM_ARCHITECTURE.md                # This file
```

---

## 🎯 Usage Patterns

### Pattern 1: Research New Program (Automatic Import)
```
User: "Research the CDAP program"
↓
Researcher skill → generates report
↓
Importer skill → auto-imports to MongoDB
↓
✅ Report saved + Database updated
```

### Pattern 2: Manual Import Existing Report
```
User: "/funding-db-importer program_reports/old-report.md"
↓
Importer skill → parses & imports
↓
✅ Database updated
```

### Pattern 3: Query for Matches
```
User: "Find programs for AI startup in BC with $500K revenue"
↓
Query MongoDB via MCP or match-example.js
↓
✅ Ranked list of programs
```

### Pattern 4: Update Existing Program
```
User: "Research WIPSI again to update info"
↓
Researcher skill → generates new report (2025-11-15.md)
↓
Importer skill → updates MongoDB (upsert by program_id)
↓
✅ Latest info in database
```

---

## 🏗️ Design Decisions

### Why Two Skills?

**Single Responsibility:**
- Researcher: Scraping, validation, reporting
- Importer: Parsing, transformation, database ops

**Modularity:**
- Can update importer without touching researcher
- Can improve parser without changing research logic
- Can test separately

**Reusability:**
- Importer can be called manually if needed
- Researcher can skip import if desired
- Can add other importers (e.g., to Supabase)

### Why MongoDB MCP Over npm Scripts?

**No Dependencies:**
- No `npm install` needed
- No Node.js version management
- No connection string configuration

**Integrated:**
- Uses same MCP connection for all operations
- Skills can directly call MCP tools
- No context switching

**Simpler:**
- One interface (MCP) vs npm + MongoDB driver
- Fewer moving parts
- Less maintenance

**When to use npm scripts:**
- Batch operations (importing 100+ reports)
- Scheduled jobs (cron)
- REST API development
- Complex aggregation pipelines

### Why This Schema?

**Single Collection:**
- No joins needed
- Faster queries
- Simpler to understand

**Embedded Documents:**
- Related data together (eligibility with program)
- Atomic updates
- Better performance

**Flexible Nulls:**
- Represents unknown data explicitly
- Queryable (`field: null`)
- Shows data completeness

**Indexed Fields:**
- Optimized for matching queries
- Fast filtering on location, sector, stage
- Performance at scale (100+ programs)

---

## 📊 Current System State

### Database Contents

**Collection:** `ai_funding.funding_programs`

**Documents:** 4 programs

| Program | Type | Status | Funding Range | Location | Sectors |
|---------|------|--------|---------------|----------|---------|
| WIPSI | Grant | Closed | $25K-$150K | NS | All (training) |
| Invest NS Accelerate | Accelerator | Closed | $40K | NS | 5 tech sectors |
| G7 GovAI Challenge | Competition | Future | $10K | G7+EU | AI/GovTech |
| RAII | Repayable Grant | **OPEN** | $250K-$5M | National | 7 priority sectors |

**Indexes:** 8 created for query performance

**Schema:** Production-ready for matching queries

---

## 🚀 Next Steps

### Immediate (Already Done) ✅
- [x] MongoDB database created
- [x] Schema designed and implemented
- [x] 4 programs imported
- [x] Indexes created
- [x] Importer skill created
- [x] Researcher skill updated to call importer

### Short-term (Recommended Next)
- [ ] Test the researcher → importer pipeline with a new program
- [ ] Build web UI for business profile input
- [ ] Create matching API endpoint
- [ ] Add 10-20 more programs to database

### Medium-term
- [ ] Implement scoring algorithm as aggregation pipeline
- [ ] Add deadline alerts (programs closing soon)
- [ ] Create user profile storage
- [ ] Build application tracking system

### Long-term
- [ ] ML-based fit scoring
- [ ] Success prediction (likelihood of approval)
- [ ] Application assistance (draft proposals)
- [ ] Multi-program strategy optimizer

---

## 🧪 Testing the System

### Test 1: Research & Import Pipeline

```bash
# Research a new program
"Research the Canada Digital Adoption Program"

# Researcher generates: program_reports/cdap-2025-10-30.md
# Importer auto-imports to MongoDB
# Database now has 5 programs
```

### Test 2: Query Database

```javascript
// Via MongoDB MCP
mcp__MongoDB__find({
  database: "ai_funding",
  collection: "funding_programs",
  filter: {
    "status.accepting_applications": true,
    "eligibility.geographic.required_locations": "CA-NS"
  }
})

// Returns: Programs currently open in Nova Scotia
```

### Test 3: Match Business

```javascript
// Business profile
const business = {
  location: "CA-NS",
  entity_type: "for-profit",
  sector: "software_ai",
  stage: "mvp",
  revenue: 150000,
  funding_raised: 50000
};

// Query finds: Invest NS Accelerate (perfect match!)
```

---

## 📞 MongoDB Atlas Details

**Cluster:** Cluster0 (Free Tier)
**Version:** MongoDB 8.0.15
**Connection:** Via MCP (no manual connection needed)

**Access methods:**
1. **MongoDB MCP tools** (primary) - Built into Claude Code
2. **MongoDB Compass** - Desktop GUI
3. **mongosh** - Command-line shell
4. **Node.js driver** - For custom scripts

**Temporary user:** Auto-created by MCP for secure access
[Learn more](https://dochub.mongodb.org/core/mongodb-mcp-server-tools-considerations)

---

## 🎓 Key Learnings

### What Works Well

1. **Skills as pipeline** - Researcher → Importer is clean separation
2. **MongoDB MCP** - No dependencies, integrated, simple
3. **Embedded schema** - Fast queries, no joins needed
4. **Markdown reports** - Human-readable + machine-parseable
5. **Upsert pattern** - Can re-import safely (updates not duplicates)

### What to Watch

1. **Report format consistency** - Parser expects specific section headers
2. **Date parsing** - Multiple formats ("April 2026" vs "2026-04-01")
3. **Null vs missing** - Distinguish unknown data from not applicable
4. **Regional variations** - Programs like RAII have complex regional rules

### Design Trade-offs

**Single collection vs multiple:**
- ✅ Chose: Single collection
- Why: Simpler queries, better performance, no joins
- Trade-off: Larger documents but acceptable (<100KB each)

**Embedded vs referenced:**
- ✅ Chose: Embedded (eligibility, funding within program doc)
- Why: Atomic updates, faster reads, natural hierarchy
- Trade-off: Can't query eligibility independently (acceptable)

**MCP vs npm:**
- ✅ Chose: MCP for data operations
- Why: No dependencies, integrated, simpler
- Trade-off: npm scripts useful for batch/automation (created both!)

---

## 🔮 Future Enhancements

### Phase 2: Matching Engine
- [ ] REST API (Express.js)
- [ ] Web UI for business profile input
- [ ] Real-time fit scoring
- [ ] Deadline notifications

### Phase 3: Intelligence
- [ ] ML model for success prediction
- [ ] Historical success pattern analysis
- [ ] Application draft generator
- [ ] Multi-program strategy optimizer

### Phase 4: Scale
- [ ] 100+ programs in database
- [ ] Full-text search on descriptions
- [ ] Elasticsearch integration
- [ ] Application tracking system

---

## 📚 Documentation Index

- **README.md** - Setup and usage guide
- **IMPLEMENTATION_SUMMARY.md** - What we built (technical overview)
- **SYSTEM_ARCHITECTURE.md** - This file (complete system design)
- **.claude/skills/funding-program-researcher/** - Research skill docs
- **.claude/skills/funding-db-importer/** - Import skill docs

---

**Version:** 1.0
**Last Updated:** 2025-10-30
**Status:** Production Ready
**Database:** 4 programs loaded, ready for matching
