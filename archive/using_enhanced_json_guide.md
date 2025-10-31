# Using the Enhanced JSON for Program Matching

## Overview

The enhanced JSON (`canadian_ai_funding_programs_enhanced.json`) is designed to power an intelligent agent that:
1. Asks the minimum questions needed to qualify/disqualify programs
2. Routes users to the best-fit programs
3. Provides clear next steps
4. Tracks data collection progress

---

## Key Features

### 1. Universal Fields (Reusable Definitions)

Located in `universal_fields` section - these are field definitions used across multiple programs:

```json
{
  "universal_fields": {
    "fields": {
      "employee_count": {
        "field_id": "employee_count",
        "field_name": "Number of Employees",
        "question_text": "How many full-time equivalent (FTE) employees...",
        "data_type": "integer",
        "help_text": "Include all full-time, part-time..."
      }
    }
  }
}
```

**Usage:** When a field has `"inherits_from": "universal_fields"`, load the base definition from universal_fields and merge with program-specific overrides.

### 2. Data Requirements Structure

Each program has structured `data_requirements`:

```json
{
  "data_requirements": {
    "mandatory": [],    // Must have to determine eligibility
    "optional": [],     // Improves assessment but not required
    "documents": [],    // Files needed for application
    "calculated_fields": []  // Derived from other fields
  }
}
```

### 3. Field Specification

Each field contains:

```json
{
  "field_id": "employee_count",          // Unique identifier
  "field_name": "Number of Employees",   // Display name
  "data_type": "integer",                // Data type
  "question_text": "How many...",        // What to ask user
  "help_text": "Include all...",         // Guidance
  "validation": {                        // Validation rules
    "min": 1,
    "max": 500
  },
  "application_section": "organization_information",  // Where used in app
  "application_field_name": "Employee Count",        // Actual form field name
  "used_for": ["eligibility", "application_form"],   // Purpose
  "disqualifies_if": "employee_count > 500",        // Disqualification logic
  "routes_to_alternative": {                         // Where to route if disqualified
    "value_condition": "alternative_program_id"
  },
  "weight": "mandatory"                              // Importance level
}
```

### 4. Collection Guidance

Tells agents how to efficiently collect data:

```json
{
  "collection_guidance": {
    "recommended_order": [              // Order to ask questions
      "employee_count",
      "years_in_operation",
      "project_type"
    ],
    "early_disqualifiers": [            // Ask these FIRST
      "employee_count",
      "project_type"
    ],
    "skip_if_disqualified": true,       // Stop asking if disqualified
    "estimated_time_minutes": 15,       // How long to collect all data
    "notes": "Additional guidance..."
  }
}
```

---

## Usage Examples

### Example 1: Qualifying a Company

```javascript
// Load enhanced JSON
const data = require('./canadian_ai_funding_programs_enhanced.json');

// Company data from database
const company = {
  id: 'f9fc19fa-f6ed-4f33-9824-18931ee3d4c7',
  name: 'The Nook',
  region: 'Nova Scotia',
  // ... initially missing most data
};

// For each program, check eligibility
function assessProgram(program, companyData) {
  const assessment = {
    program_id: program.id,
    program_name: program.name,
    eligible: null,
    missing_data: [],
    disqualified: false,
    disqualification_reasons: [],
    confidence: 0
  };

  // Check mandatory fields
  const mandatory = program.data_requirements.mandatory;
  let provided = 0;

  for (const field of mandatory) {
    const fieldId = field.field_id;
    const value = companyData[fieldId];

    // Missing data
    if (value === undefined || value === null) {
      assessment.missing_data.push({
        field_id: fieldId,
        question: field.question_text,
        help_text: field.help_text,
        priority: field.weight === 'mandatory' ? 1 : 2
      });
      continue;
    }

    provided++;

    // Validate
    if (field.validation) {
      // Check min/max
      if (field.validation.min && value < field.validation.min) {
        assessment.disqualified = true;
        assessment.disqualification_reasons.push({
          field: fieldId,
          reason: `${field.field_name} must be at least ${field.validation.min}`,
          current_value: value
        });
      }

      if (field.validation.max && value > field.validation.max) {
        assessment.disqualified = true;
        assessment.disqualification_reasons.push({
          field: fieldId,
          reason: `${field.field_name} must be at most ${field.validation.max}`,
          current_value: value
        });

        // Check for alternative program
        if (field.routes_to_alternative) {
          assessment.alternative_program = field.routes_to_alternative[value];
        }
      }

      // Check allowed values
      if (field.validation.allowed_values && !field.validation.allowed_values.includes(value)) {
        assessment.disqualified = true;
        assessment.disqualification_reasons.push({
          field: fieldId,
          reason: `${field.field_name} must be one of: ${field.validation.allowed_values.join(', ')}`,
          current_value: value
        });
      }
    }
  }

  // Calculate confidence
  assessment.confidence = Math.round((provided / mandatory.length) * 100);

  // Determine eligibility
  if (assessment.disqualified) {
    assessment.eligible = false;
  } else if (assessment.missing_data.length === 0) {
    assessment.eligible = true;
  } else {
    assessment.eligible = null; // Unknown until all data collected
  }

  return assessment;
}

// Assess all programs
const assessments = data.programs.map(program =>
  assessProgram(program, company)
);

// Result example:
{
  program_id: 'ca-ns-productivity-innovation-voucher',
  program_name: 'Nova Scotia Productivity and Innovation Voucher',
  eligible: null,  // Unknown - need more data
  missing_data: [
    {
      field_id: 'employee_count',
      question: 'How many full-time equivalent (FTE) employees does your organization have?',
      help_text: 'Include all full-time, part-time...',
      priority: 1
    },
    {
      field_id: 'business_structure',
      question: 'What is your business structure?',
      priority: 1
    }
  ],
  confidence: 20  // Only have 20% of required data
}
```

### Example 2: Smart Question Flow

```javascript
// Use collection_guidance to ask questions efficiently

function buildQuestionFlow(program, companyData) {
  const guidance = program.collection_guidance;
  const mandatory = program.data_requirements.mandatory;

  // Start with early disqualifiers
  const questions = [];

  for (const fieldId of guidance.early_disqualifiers) {
    const field = mandatory.find(f => f.field_id === fieldId);

    // Skip if already have data
    if (companyData[fieldId] !== undefined) continue;

    questions.push({
      field_id: fieldId,
      question: field.question_text,
      help_text: field.help_text,
      data_type: field.data_type,
      validation: field.validation,
      is_early_disqualifier: true,
      stop_if_disqualified: guidance.skip_if_disqualified
    });
  }

  // Then ask remaining questions in recommended order
  for (const fieldId of guidance.recommended_order) {
    if (guidance.early_disqualifiers.includes(fieldId)) continue;
    if (companyData[fieldId] !== undefined) continue;

    const field = mandatory.find(f => f.field_id === fieldId);
    if (!field) continue;

    questions.push({
      field_id: fieldId,
      question: field.question_text,
      help_text: field.help_text,
      data_type: field.data_type,
      validation: field.validation,
      is_early_disqualifier: false
    });
  }

  return questions;
}

// Usage
const questions = buildQuestionFlow(
  data.programs.find(p => p.id === 'ca-fed-raii'),
  { region: 'Nova Scotia' }  // Only have region
);

// Agent asks first question
console.log(questions[0]);
// {
//   field_id: 'employee_count',
//   question: 'How many full-time equivalent (FTE) employees does your organization have?',
//   is_early_disqualifier: true,
//   stop_if_disqualified: true
// }

// User answers: 550 employees
// Check validation: max is 500
// → Disqualified! Stop asking questions for RAII
// → Route to alternative (if specified)
```

### Example 3: Multi-Program Data Collection

```javascript
// Optimize data collection across multiple programs

function getUnifiedQuestionSet(programs, companyData) {
  const allFields = new Map();

  // Aggregate all mandatory fields across programs
  for (const program of programs) {
    for (const field of program.data_requirements.mandatory) {
      const fieldId = field.field_id;

      // Skip if already collected
      if (companyData[fieldId] !== undefined) continue;

      if (!allFields.has(fieldId)) {
        allFields.set(fieldId, {
          field_id: fieldId,
          field_name: field.field_name,
          question: field.question_text,
          help_text: field.help_text,
          data_type: field.data_type,
          validation: field.validation,
          needed_for_programs: []
        });
      }

      allFields.get(fieldId).needed_for_programs.push(program.id);
    }
  }

  // Sort by number of programs that need it
  const questions = Array.from(allFields.values()).sort((a, b) =>
    b.needed_for_programs.length - a.needed_for_programs.length
  );

  return questions;
}

// Usage
const targetPrograms = [
  data.programs.find(p => p.id === 'ca-fed-raii'),
  data.programs.find(p => p.id === 'ca-fed-nrc-irap'),
  data.programs.find(p => p.id === 'ca-ns-productivity-innovation-voucher')
];

const questions = getUnifiedQuestionSet(targetPrograms, company);

// Result shows employee_count is needed by all 3 programs - ask it once!
// {
//   field_id: 'employee_count',
//   question: 'How many FTE employees...',
//   needed_for_programs: ['ca-fed-raii', 'ca-fed-nrc-irap', 'ca-ns-productivity-innovation-voucher']
// }
```

---

## Database Integration Strategy

### Step 1: Store Field Mappings

```sql
-- Create a materialized view or table that maps field_ids to programs
CREATE TABLE program_field_requirements AS
SELECT
  program_id,
  field_id,
  field_name,
  data_type,
  question_text,
  is_mandatory,
  weight,
  validation_rules,
  application_section
FROM (
  -- This would be populated from JSON
  -- Either manually or via migration script
);
```

### Step 2: Track Collection Progress

```sql
-- When user provides data
INSERT INTO data_collection_progress (
  company_id,
  field_id,
  status,
  priority,
  provided_at
) VALUES (
  'f9fc19fa-f6ed-4f33-9824-18931ee3d4c7',
  'employee_count',
  'provided',
  1,
  NOW()
);

-- Update company_data_profile
UPDATE company_data_profile
SET
  employee_count = 25,
  employee_count_updated_at = NOW(),
  employee_count_verified = false
WHERE company_id = 'f9fc19fa-f6ed-4f33-9824-18931ee3d4c7';
```

### Step 3: Query What's Missing

```sql
-- For a specific company and program, what data is still needed?
WITH required_fields AS (
  SELECT field_id, is_mandatory
  FROM program_field_requirements
  WHERE program_id = 'ca-fed-raii'
),
collected_data AS (
  SELECT field_id, status
  FROM data_collection_progress
  WHERE company_id = 'f9fc19fa-f6ed-4f33-9824-18931ee3d4c7'
)
SELECT
  rf.field_id,
  rf.is_mandatory,
  COALESCE(cd.status, 'needed') as status
FROM required_fields rf
LEFT JOIN collected_data cd ON rf.field_id = cd.field_id
WHERE COALESCE(cd.status, 'needed') != 'provided';

-- Results show what's missing:
-- employee_count (mandatory) - needed
-- project_cost_estimate (mandatory) - needed
-- industry_sector (optional) - needed
```

---

## Agent Conversation Flow

### Scenario: The Nook applies for funding

**What we know:**
- Name: The Nook
- Region: Nova Scotia
- Industry: Food & Beverage

**What we need:** Everything else

### Smart Agent Flow:

```
AGENT: I can help match you to AI funding programs! Let me ask a few quick questions.

[Agent loads enhanced JSON and sees 3 potential NS programs: RAII, PIV, BDC]
[Agent checks collection_guidance.early_disqualifiers for each]
[Common early disqualifier: employee_count]

AGENT: First, how many full-time equivalent (FTE) employees does The Nook have?
       (Include all full-time, part-time converted to FTE, and contract employees)

USER: We have 12 employees.

[Agent updates company_data_profile: employee_count = 12]
[Agent re-evaluates all programs:]
  - RAII: ✅ Still possible (1-500 employees)
  - PIV: ✅ Still possible (<100 employees)
  - BDC: ✅ Still possible (no limit)
  - NRC IRAP: ✅ Still possible (<500 employees)

AGENT: Great! That keeps several options open.

[Next early disqualifier: project_type]

AGENT: What type of AI project are you pursuing?
       a) Early-stage R&D (developing new AI technology)
       b) Adopting existing AI solutions to transform operations
       c) Planning/consulting for AI strategy

USER: b) Adopting existing AI solutions - we need procurement software

[Agent updates: project_type = 'adopting_ai']
[Agent re-evaluates:]
  - RAII: ✅ Still possible (adoption is Pillar 2)
  - PIV: ✅ Still possible (can test solutions with university)
  - BDC: ✅ Perfect fit (adoption focus)
  - NRC IRAP: ❌ DISQUALIFIED (IRAP is for R&D only)

[Agent routes IRAP to alternatives per JSON:]
  "routes_to_alternative": {
    "adopting_ai": "ca-fed-raii"
  }

AGENT: Since you're adopting existing solutions, NRC IRAP isn't a fit (they fund R&D).
       However, you still qualify for 3 programs!

[Next critical question for RAII: project_cost_estimate]

AGENT: What's your estimated total project cost for the procurement system?
       (Include software, implementation, training, etc.)

USER: Probably around $50,000

[Agent updates: project_cost_estimate = 50000]
[Agent checks RAII validation:]
  validation.min = 500000
  50000 < 500000 → DISQUALIFIED

AGENT: Your project ($50K) is below RAII's minimum ($500K).

       ✅ EXCELLENT MATCHES FOR YOU:

       1. BDC Data to AI Program
          - Perfect for $50K adoption projects
          - Advisory + financing included
          - Next step: Call 1-877-232-2269

       2. NS Productivity & Innovation Voucher
          - FREE $15K university R&D support
          - Perfect for testing solutions before buying
          - Next step: Contact Dal/NSCC
          - Deadline: May 7-June 4, 2025

       Would you like me to prepare your application materials?

[Agent has now saved time by asking only 3 questions instead of 20+]
```

---

## Data Requirements Summary by Program

### Quick Reference: What to Collect

| Field | RAII | IRAP | DMAP | PIV | BDC | Scale AI |
|-------|------|------|------|-----|-----|----------|
| **business_structure** | ✅ M | ✅ M | ✅ M | ✅ M | ✅ M | - |
| **employee_count** | ✅ M | ✅ M | ✅ M | ✅ M | ⚪ O | - |
| **years_in_operation** | ✅ M | ⚪ O | - | - | ⚪ O | - |
| **region** | ✅ M | - | ✅ M | ✅ M | - | - |
| **canadian_operations** | ✅ M | ✅ M | - | - | ✅ M | - |
| **project_type** | ✅ M | ✅ M | ✅ M | - | ✅ M | - |
| **project_cost_estimate** | ✅ M | ⚪ O | ✅ M | - | ⚪ O | ✅ M |
| **funding_secured_%** | ✅ M | - | - | - | - | - |
| **technical_uncertainty** | - | ✅ M | - | - | - | - |
| **commercialization_potential** | - | ✅ M | - | - | - | - |
| **project_started** | ✅ M | ✅ M | - | - | - | - |
| **creditworthiness** | - | - | - | - | ✅ M | - |
| **consortium_formed** | - | - | - | - | - | ✅ M |
| **creates_new_ip** | - | - | - | - | - | ✅ M |

**Legend:**
- ✅ M = Mandatory
- ⚪ O = Optional (improves assessment)
- `-` = Not needed

---

## Efficient Collection Strategy

### Strategy 1: Universal First
Ask universal fields that apply to most programs first:
1. **region** (routes to correct programs immediately)
2. **business_structure** (major disqualifier)
3. **employee_count** (major disqualifier)
4. **project_type** (determines R&D vs adoption)
5. **canadian_operations** (basic requirement)

### Strategy 2: Early Disqualification
After universal fields, ask program-specific early disqualifiers:
- **RAII:** project_cost_estimate (must be $500K+)
- **DMAP:** region (must be Ontario)
- **PIV:** region (must be Nova Scotia) + employee_count (<100)

### Strategy 3: Conditional Collection
Only collect fields if program is still viable:
- Don't ask about "funding_secured_percentage" if project_cost < $500K (won't qualify for RAII anyway)
- Don't ask about "consortium_formed" if project_cost < $1.5M (won't qualify for Scale AI)

---

## Integration with Your Existing Database

### Query Pattern: Get Missing Data for Initiative

```sql
-- For McCarthy's Roofing initiative
WITH initiative_data AS (
  SELECT
    i.id as initiative_id,
    i.company_id,
    i.title,
    c.employee_count,
    c.annual_revenue,
    c.founded_year,
    c.headquarters_province as region
  FROM initiatives i
  JOIN companies c ON i.company_id = c.id
  WHERE i.id = '30749852-a678-4c98-91c8-d45e31287b27'
)
SELECT
  CASE WHEN employee_count IS NULL THEN 'employee_count' END as missing_employee_count,
  CASE WHEN annual_revenue IS NULL THEN 'annual_revenue' END as missing_annual_revenue,
  CASE WHEN founded_year IS NULL THEN 'founded_year' END as missing_founded_year
FROM initiative_data;
```

### Query Pattern: Companies by Completeness

```sql
-- Which companies have enough data to assess?
SELECT
  c.name,
  c.employee_count,
  c.annual_revenue,
  c.headquarters_province,
  CASE
    WHEN c.employee_count IS NOT NULL
     AND c.headquarters_province IS NOT NULL THEN 'Assessable'
    ELSE 'Need more data'
  END as status
FROM companies c;
```

---

## Validation Logic Implementation

### Field Validation Function

```javascript
function validateField(field, value) {
  const errors = [];

  if (!field.validation) return { valid: true, errors: [] };

  // Type validation
  if (field.data_type === 'integer' && !Number.isInteger(value)) {
    errors.push(`${field.field_name} must be a whole number`);
  }

  if (field.data_type === 'decimal' && typeof value !== 'number') {
    errors.push(`${field.field_name} must be a number`);
  }

  // Range validation
  if (field.validation.min !== undefined && value < field.validation.min) {
    errors.push(`${field.field_name} must be at least ${field.validation.min}`);
  }

  if (field.validation.max !== undefined && value > field.validation.max) {
    errors.push(`${field.field_name} must be at most ${field.validation.max}`);
  }

  // Enum validation
  if (field.validation.allowed_values && !field.validation.allowed_values.includes(value)) {
    errors.push(`${field.field_name} must be one of: ${field.validation.allowed_values.join(', ')}`);
  }

  // Pattern validation (for strings like CRA number)
  if (field.validation.pattern) {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(value)) {
      errors.push(`${field.field_name} format is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

---

## Calculated Fields Implementation

```javascript
function calculateDerivedFields(program, companyData) {
  const calculated = {};

  for (const calcField of program.data_requirements.calculated_fields) {
    // Simple formula parser
    const formula = calcField.formula;

    // Example: "project_cost_estimate * 0.5"
    if (formula.includes('project_cost_estimate * 0.5')) {
      calculated[calcField.field_id] = companyData.project_cost_estimate * 0.5;
    }

    // Example: "MIN(project_cost_estimate * 0.5, 15000)"
    if (formula.includes('MIN(project_cost_estimate * 0.5, 15000)')) {
      calculated[calcField.field_id] = Math.min(
        companyData.project_cost_estimate * 0.5,
        15000
      );
    }

    // Apply bounds if specified
    if (calcField.bounds) {
      if (calcField.bounds.min && calculated[calcField.field_id] < calcField.bounds.min) {
        calculated[calcField.field_id] = null; // Below minimum
      }
      if (calcField.bounds.max && calculated[calcField.field_id] > calcField.bounds.max) {
        calculated[calcField.field_id] = calcField.bounds.max; // Cap at maximum
      }
    }
  }

  return calculated;
}

// Usage
const company = {
  project_cost_estimate: 600000
};

const calculated = calculateDerivedFields(
  data.programs.find(p => p.id === 'ca-fed-raii'),
  company
);

console.log(calculated);
// {
//   raii_funding_amount: 300000,  // 600000 * 0.5
//   non_government_funding_required: 300000  // 600000 - 300000
// }
```

---

## Agent Response Templates

### Template: Need More Data

```
I found {count} programs that might be a fit, but I need more information to confirm eligibility.

Let me ask you {questions.length} quick questions ({estimated_time} minutes):

1. {question_1.question_text}
   {question_1.help_text}

2. {question_2.question_text}
   {question_2.help_text}

These questions help me determine if you qualify for:
- {program_1.name}
- {program_2.name}
```

### Template: Qualified Match

```
✅ GREAT NEWS! You qualify for {program.name}

**What you get:**
- {program.funding_details}

**What you need to apply:**
{missing_documents.map(d => `- ${d.document_name}: ${d.description}`).join('\n')}

**Next steps:**
1. {next_step_1}
2. {next_step_2}

**Timeline:** {program.timeline_estimate}

Would you like help preparing these documents?
```

### Template: Disqualified with Alternative

```
Unfortunately, you don't qualify for {program.name} because:
- {disqualification_reason}

However, you're a perfect fit for {alternative_program.name}!

This program is actually better for your situation because {explanation}.

Shall I help you apply to {alternative_program.name}?
```

---

## Best Practices

### 1. Ask Questions in Batches

Don't ask 20 questions one-by-one. Group them:

**Batch 1: Business Basics (Universal)**
- Business structure
- Employee count
- Years in operation
- Region

**Batch 2: Project Basics**
- Project type (R&D vs adoption)
- Project cost estimate
- Timeline

**Batch 3: Program-Specific** (only if still eligible)
- Funding secured
- Technical uncertainty
- etc.

### 2. Show Progress

```
Data Collection Progress: 5/10 questions answered (50%)

Eligible Programs So Far:
✅ BDC Data to AI - Highly Recommended
✅ NS PIV - Recommended
⚠️ RAII - Need 2 more answers to determine
❌ IRAP - Not eligible (adoption project)
```

### 3. Explain Disqualifications

```
❌ You don't qualify for RAII because:
   - Your project cost ($50K) is below the minimum ($500K)

💡 However, this is actually GOOD NEWS!
   - RAII is overkill for your needs
   - BDC Data to AI is better suited for $50K projects
   - You'll get faster approval and more flexible terms
```

### 4. Prioritize by Fit Score

Use the enhanced data to calculate fit:
- 100 pts: All mandatory criteria met + in priority sector + perfect size
- 80 pts: All mandatory criteria met + good fit
- 60 pts: Eligible but not ideal fit
- 40 pts: Missing some optional data
- 0 pts: Disqualified

---

## Sample Agent Implementation

```python
class FundingMatchingAgent:
    def __init__(self, programs_json_path):
        with open(programs_json_path) as f:
            self.data = json.load(f)
        self.programs = self.data['programs']
        self.universal_fields = self.data['universal_fields']['fields']

    def start_assessment(self, company_id):
        """Start funding assessment for a company."""
        # Get existing data
        company_data = self.load_company_data(company_id)

        # Get all potentially eligible programs
        potential_programs = self.filter_by_region(company_data.get('region'))

        # Build question flow
        questions = self.build_question_flow(potential_programs, company_data)

        return {
            'company_id': company_id,
            'potential_programs': len(potential_programs),
            'questions_needed': len(questions),
            'estimated_time_minutes': sum(p.collection_guidance.estimated_time_minutes for p in potential_programs) // len(potential_programs),
            'first_question': questions[0] if questions else None
        }

    def answer_question(self, company_id, field_id, value):
        """Process user's answer and determine next question."""
        # Save answer
        self.save_field_value(company_id, field_id, value)

        # Validate
        validation_result = self.validate_field_value(field_id, value)
        if not validation_result['valid']:
            return {
                'status': 'validation_error',
                'errors': validation_result['errors']
            }

        # Re-assess all programs
        company_data = self.load_company_data(company_id)
        assessments = [self.assess_program(p, company_data) for p in self.programs]

        # Check for early disqualifications
        newly_disqualified = [a for a in assessments if a['just_disqualified']]

        # Get next question
        eligible_programs = [a for a in assessments if a['eligible'] != False]
        next_question = self.get_next_question(eligible_programs, company_data)

        return {
            'status': 'success',
            'value_saved': value,
            'newly_disqualified_programs': newly_disqualified,
            'still_eligible_count': len(eligible_programs),
            'next_question': next_question,
            'progress_percentage': self.calculate_progress(company_data),
            'can_make_recommendations': next_question is None
        }

    def make_recommendations(self, company_id):
        """Generate final program recommendations."""
        company_data = self.load_company_data(company_id)
        assessments = [self.assess_program(p, company_data) for p in self.programs]

        # Filter to eligible and sort by fit score
        eligible = [a for a in assessments if a['eligible'] == True]
        eligible.sort(key=lambda x: x['fit_score'], reverse=True)

        recommendations = []
        for assessment in eligible[:5]:  # Top 5
            program = next(p for p in self.programs if p['id'] == assessment['program_id'])

            recommendations.append({
                'program_id': assessment['program_id'],
                'program_name': assessment['program_name'],
                'fit_score': assessment['fit_score'],
                'priority': self.get_priority_label(assessment['fit_score']),
                'funding_amount': self.calculate_funding_amount(program, company_data),
                'next_steps': program['agent_decision_logic']['next_steps_if_qualified'],
                'missing_documents': assessment.get('missing_documents', []),
                'timeline': program['application_process']['total_timeline_estimate']
            })

        return {
            'recommendations': recommendations,
            'total_eligible': len(eligible),
            'data_completeness': self.calculate_progress(company_data)
        }
```

---

## Next Steps

With this enhanced JSON, you can now:

1. ✅ **Build UI wizard** that dynamically generates forms from data_requirements
2. ✅ **Create API endpoint** that returns next question based on current data
3. ✅ **Track progress** in database using field_ids as references
4. ✅ **Generate eligibility reports** showing exactly why companies qualify/don't qualify
5. ✅ **Optimize user time** by asking only necessary questions

The JSON serves as the **single source of truth** for:
- What questions to ask
- When to ask them
- How to validate answers
- When to stop asking (early disqualification)
- Where to route users (alternatives)
- What documents are needed
- How to calculate funding amounts

---

**File created:** `/Volumes/SD/ai_funding/canadian_ai_funding_programs_enhanced.json`

Want me to create the database migration SQL next, or build a working Python/TypeScript matching algorithm?
