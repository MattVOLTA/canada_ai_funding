# AI Funding Program Database

A MongoDB-based system for matching businesses with relevant funding programs based on detailed eligibility criteria.

## Overview

This system:
1. **Parses** detailed markdown funding program reports
2. **Imports** structured data into MongoDB Atlas
3. **Matches** businesses to relevant funding programs based on multi-criteria filtering and scoring

## Database Structure

### Collection: `funding_programs`

**Key Fields:**
- `program_id`: Unique identifier (e.g., `ca-ns-wipsi`)
- `name`: Full program name
- `eligibility`: Detailed eligibility criteria (geographic, entity types, sectors, stage, revenue, etc.)
- `funding`: Funding amounts, type, repayment terms
- `status`: Application status, deadlines, intake pattern
- `priority_factors`: Scoring weights for fit quality assessment

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure MongoDB Connection

Copy `.env.example` to `.env` and add your MongoDB Atlas connection string:

```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net
```

### 3. Run Migration

Import all markdown reports from `program_reports/`:

```bash
npm run migrate
```

The migration will:
- Parse each `.md` file in `program_reports/`
- Extract structured data
- Upsert into MongoDB (update existing, insert new)
- Create indexes for query performance

## Usage Examples

### Example 1: Find Programs for NS Early-Stage AI Startup

```javascript
// Business profile
const business = {
  location: 'CA-NS',
  entity_type: 'for-profit',
  sector: 'software_ai',
  stage: 'mvp',
  revenue: 150000,
  funding_raised: 50000,
  employees: 3
};

// Query
db.funding_programs.find({
  'eligibility.geographic.required_locations': business.location,
  'eligibility.entity_types': business.entity_type,
  $or: [
    { 'eligibility.sectors.mode': 'open' },
    { 'eligibility.sectors.allowed': business.sector }
  ],
  $or: [
    { 'eligibility.revenue.max': null },
    { 'eligibility.revenue.max': { $gte: business.revenue } }
  ],
  $or: [
    { 'eligibility.funding_raised.max': null },
    { 'eligibility.funding_raised.max': { $gte: business.funding_raised } }
  ]
});
```

**Result**: Invest NS Accelerate (perfect fit!)

### Example 2: Find Training Programs for Established Manufacturer

```javascript
// Business profile
const business = {
  location: 'CA-NS',
  entity_type: 'for-profit',
  sector: 'manufacturing',
  stage: 'established',
  employees: 45,
  needs: 'workforce_training'
};

// Query
db.funding_programs.find({
  'eligibility.geographic.required_locations': business.location,
  'eligibility.stage.allowed': business.stage,
  'program_type': 'grant',
  'eligibility.sectors.priority': { $in: ['advanced_manufacturing'] }
});
```

**Result**: WIPSI (excellent fit for workforce training!)

### Example 3: Find International AI Competitions

```javascript
// Researcher profile
const researcher = {
  location: 'FR',
  entity_type: 'academic',
  sector: 'ai',
  looking_for: 'competition'
};

// Query
db.funding_programs.find({
  'eligibility.geographic.allowed_countries': researcher.location,
  'eligibility.entity_types': researcher.entity_type,
  'program_type': 'competition'
});
```

**Result**: G7 GovAI Grand Challenge

## Scoring Algorithm (Fit Quality)

To calculate fit quality percentage:

```javascript
function calculateFitScore(business, program) {
  let score = 0;
  let maxScore = 0;

  // Geographic match (20 points)
  maxScore += 20;
  if (program.eligibility.geographic.required_locations.includes(business.location)) {
    score += 20;
  }

  // Entity type match (15 points)
  maxScore += 15;
  if (program.eligibility.entity_types.includes(business.entity_type)) {
    score += 15;
  }

  // Sector match (20 points)
  maxScore += 20;
  if (program.eligibility.sectors.mode === 'open') {
    score += 15; // Open to all sectors
  } else if (program.eligibility.sectors.allowed.includes(business.sector)) {
    score += 20; // Exact sector match
  }

  // Stage match (15 points)
  maxScore += 15;
  if (program.eligibility.stage.allowed.includes(business.stage)) {
    score += 15;
  }

  // Revenue limits (10 points)
  maxScore += 10;
  if (!program.eligibility.revenue.max || business.revenue <= program.eligibility.revenue.max) {
    score += 10;
  }

  // Priority bonuses (20 points)
  maxScore += 20;
  if (program.eligibility.sectors.priority.includes(business.sector)) {
    score += 10;
  }
  // Additional priority factors...

  return (score / maxScore) * 100;
}
```

## Program Reports

Add new programs by creating markdown reports in `program_reports/`:

```markdown
# Program Research Report: [Program Name]

**Research Date:** YYYY-MM-DD
**Program Status:** Open/Closed/Future
**Completeness Score:** XX/100
**Data Quality Score:** XX/100

## Executive Summary
...

## Eligibility Criteria
...

## Funding Details
...
```

Then run:
```bash
npm run migrate
```

## Indexes

The system creates the following indexes for performance:

- `status.accepting_applications`
- `status.next_deadline`
- `eligibility.geographic.required_locations`
- `eligibility.entity_types`
- `eligibility.sectors.allowed`
- `eligibility.stage.allowed`
- `program_type`
- `program_id` (unique)

## Query Performance Tips

1. **Always filter by location first** - most selective field
2. **Use compound queries** for entity_type + location
3. **Index usage** - queries starting with indexed fields will be fastest
4. **Projection** - only return fields you need:
   ```javascript
   .find({...}, { name: 1, funding.amounts: 1, status: 1 })
   ```

## Current Programs in Database

- **WIPSI** - Nova Scotia workforce training grant
- **Invest NS Accelerate** - Nova Scotia startup accelerator
- **G7 GovAI Grand Challenge** - International AI competition

## Future Enhancements

- [ ] Add full-text search on descriptions
- [ ] Implement scoring algorithm as MongoDB aggregation pipeline
- [ ] Add deadline alerts (programs closing soon)
- [ ] Create REST API for matching service
- [ ] Add program recommendation engine with ML

## License

Internal use only
