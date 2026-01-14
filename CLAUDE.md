# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A MongoDB-based system for matching businesses with relevant Canadian AI funding programs. The system consists of two automated pipelines:

1. **Research Pipeline**: Automated web scraping of government funding programs → structured markdown reports
2. **Database Pipeline**: Markdown parsing → MongoDB import → intelligent matching queries

## Key Commands

### Development Workflow

```bash
# Install dependencies
npm install

# Parse markdown reports and import into MongoDB
npm run migrate

# Import single report
npm run migrate:single

# Test parser on reports
npm test

# Run matching example
node src/match-example.js
```

### Database Operations

The system uses **MongoDB MCP** as the primary interface. Database operations should be performed through MCP tools rather than npm scripts when possible, as MCP is integrated into the skill pipeline.

**When to use npm scripts:**
- Batch importing 10+ reports at once
- Scheduled/automated jobs
- Custom aggregation pipelines
- Development testing

## Architecture

### Two-Skill Pipeline

**1. Funding Program Researcher (`.claude/skills/funding-program-researcher/`)**
- Researches government programs via web scraping
- Generates comprehensive markdown reports
- Saves to `program_reports/{slug}-{date}.md`
- Automatically calls importer skill when complete

**2. Funding DB Importer (`.claude/skills/funding-db-importer/`)**
- Parses markdown reports
- Maps to MongoDB schema
- Upserts to `ai_funding.funding_programs` collection
- Can be invoked standalone: `/funding-db-importer program_reports/[file].md`

### Data Flow

```
User provides program URL
    ↓
Researcher skill (30-60 min)
    ↓
Markdown report in program_reports/
    ↓
Importer skill (automatic or manual)
    ↓
MongoDB document in ai_funding.funding_programs
    ↓
Query/matching via MCP or src/match-example.js
```

### Database Structure

**Database:** `ai_funding`
**Collection:** `funding_programs`

**Key schema fields:**
- `program_id`: Unique identifier (e.g., `ca-ns-wipsi`)
- `eligibility`: Nested document with geographic, entity_types, sectors, stage, revenue constraints
- `funding`: Amounts, type (grant/loan/equity), repayment terms
- `status`: accepting_applications, current_status, deadlines, intake_pattern
- `contacts`: Array of contact objects with email, phone, regional info

**Critical indexes** (created by migration):
- `program_id` (unique)
- `status.accepting_applications`
- `eligibility.geographic.required_locations`
- `eligibility.entity_types`
- `eligibility.sectors.allowed`
- `eligibility.stage.allowed`

### Parser Architecture (src/parser.js)

The `FundingReportParser` class uses a **section-extraction pattern**:

1. **Line-based parsing**: Splits markdown into lines, finds section headers (`## Title`)
2. **Section extractors**: Each major section has a dedicated extraction method
3. **Field-specific parsers**: Granular parsers for dates, currency, percentages, regex-based matching
4. **Null-friendly**: Returns `null` for missing data rather than omitting fields (queryable in MongoDB)

**Adding new fields:**
1. Add parser method in `FundingReportParser` class
2. Call from `parse()` method
3. Update MongoDB schema expectations in migrate.js
4. Rerun migration: `npm run migrate`

### Matching Algorithm (src/match-example.js)

**Scoring system (0-100%):**
- Geographic match: 20 points (mandatory, hard stop if fails)
- Entity type match: 15 points (mandatory)
- Sector match: 20 points (open sectors get 15)
- Stage match: 15 points
- Revenue check: 10 points (hard stop if exceeds max)
- Funding raised check: 10 points
- Priority sector bonus: 10 points

**Verdicts:**
- 90-100%: EXCELLENT FIT
- 75-89%: GOOD FIT
- 60-74%: MODERATE FIT
- <60%: WEAK FIT
- 0%: INELIGIBLE (failed mandatory criteria)

## MongoDB Connection

**Connection string:** mongodb+srv://cluster0.b4wapis.mongodb.net

**Primary interface:** MongoDB MCP (integrated into Claude Code)

**Alternative interfaces:**
- MongoDB Compass (GUI)
- mongosh (CLI)
- Node.js driver (for scripts)

The MCP connection creates temporary credentials automatically - no `.env` configuration needed for skill usage.

## Report Structure Requirements

When creating or modifying markdown reports in `program_reports/`, maintain this structure for successful parsing:

**Required sections:**
- `# Program Research Report: [PROGRAM NAME]`
- `**Research Date:** YYYY-MM-DD`
- `**Completeness Score:** XX/100`
- `**Data Quality Score:** XX/100`
- `## Executive Summary`
- `## Eligibility Criteria`
  - `### Who Qualifies (Mandatory Requirements)`
  - `### Who Does NOT Qualify (Disqualifiers)`
- `## Funding Details`
  - `### Funding Amounts`
  - `### Funding Type and Terms`
- `## Deadlines and Timelines`
  - `### Timeline Estimates`
- `## Contact Information`
- `## 🚨 Critical Information` (for status/deadlines)

**Parser relies on exact header matching** - changing section titles will break extraction.

## Regional Programs

For programs with regional delivery models (like RAII):
- Document all regional agencies in separate subsections
- Create comparison tables for regional differences
- Include region-specific contact info
- Note any eligibility variations by region

The parser will extract the primary program details; regional variants should be noted in `other_requirements` or program description fields.

## Quality Assurance

**Source credibility tiers:**
1. Official .gov.ca pages, PDFs, press releases
2. Major news outlets (CBC, Globe and Mail)
3. Reputable consultants with citations

**Confidence scoring (0-100):**
- 90-100: Multiple authoritative sources, current
- 70-89: Single authoritative source
- 50-69: Third-party sources only
- 30-49: Conflicting information
- <30: Significant gaps

Reports with critical sections <70% confidence should trigger additional research or manual review.

## Common Development Tasks

### Adding a New Program

1. Research: User provides URL to researcher skill
2. Review: Check generated report in `program_reports/`
3. Import: Skill auto-imports, or run `/funding-db-importer [report-path]`
4. Verify: Query MongoDB to confirm insertion

### Updating Existing Program

1. Re-research with current URL
2. New report generated: `[slug]-[new-date].md`
3. Import runs upsert on `program_id` → updates existing document
4. Old report remains in `program_reports/` for historical reference

### Testing Matching Logic

Edit `src/match-example.js` business profiles:
```javascript
const business = {
  location: 'CA-NS',        // Province/country code
  entity_type: 'for-profit', // for-profit, non-profit, academic, etc.
  sector: 'software_ai',     // Sector code
  stage: 'mvp',             // idea, poc, mvp, early_revenue, established
  revenue: 150000,          // Annual revenue (number)
  funding_raised: 50000,    // Total raised to date
  employees: 3              // Team size
};
```

Run: `node src/match-example.js`

### Schema Changes

When modifying MongoDB schema:
1. Update parser logic in `src/parser.js`
2. Update indexes in `createIndexes()` function in `src/migrate.js`
3. Test with: `npm test`
4. Run full migration: `npm run migrate`
5. Update README.md schema documentation

## File Organization

```
/ai_funding/
├── .claude/skills/
│   ├── funding-program-researcher/   # Research automation
│   └── funding-db-importer/         # MongoDB import
├── program_reports/                  # Markdown research outputs
│   ├── _REGISTRY.md                 # Master index
│   └── [program]-[date].md          # Individual reports
├── src/
│   ├── parser.js                    # Markdown → JSON transformer
│   ├── migrate.js                   # Batch import script
│   └── match-example.js             # Scoring algorithm demo
├── archive/                          # Historical/deprecated files
├── README.md                         # Setup & query examples
├── SYSTEM_ARCHITECTURE.md           # Complete system design doc
└── package.json                      # npm configuration
```

## Troubleshooting

### Parser Issues

**Symptom:** Fields extracting as `null` or empty arrays

**Solutions:**
1. Check markdown section headers match expected format exactly
2. Verify regex patterns in parser methods
3. Add debug logging to specific parser method
4. Test with `npm test` to see parsed output

### Import Failures

**Symptom:** Migration script reports errors or "Missing required fields"

**Solutions:**
1. Verify `program_id` and `name` are extracted (required fields)
2. Check MongoDB connection via MCP
3. Review report structure matches expected sections
4. Run single import with verbose logging: `npm run migrate:single`

### Matching Returns No Results

**Symptom:** Business profile returns 0 matches

**Solutions:**
1. Verify MongoDB has programs: Check via MongoDB MCP tools
2. Check mandatory filters (location, entity_type) match programs in DB
3. Review business profile field values match enum types
4. Query directly: Use MongoDB MCP `find` with simple filter to verify data exists

## MongoDB MCP vs npm Scripts

**Use MongoDB MCP tools when:**
- Importing single reports (via skill pipeline)
- Querying for matching programs
- Inspecting database structure
- Working within Claude Code environment

**Use npm scripts when:**
- Batch importing 10+ reports
- Setting up database from scratch
- Running automated/scheduled jobs
- Developing locally without MCP connection

## Current System State

**Programs in database:** 6
- WIPSI (NS workforce training grant) - Closed
- Invest NS Accelerate (NS startup accelerator) - Closed
- G7 GovAI Grand Challenge (International AI competition) - Future
- RAII (Federal AI commercialization) - Open
- NRC IRAP (Federal R&D funding) - Open
- Volta Residency (NS startup accelerator) - Open

**Reports available:** Check `program_reports/_REGISTRY.md` for full list

**Database ready for:** Production matching queries
