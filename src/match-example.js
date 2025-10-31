/**
 * Example: Business-to-Program Matching with Scoring
 *
 * Demonstrates how to match a business profile to funding programs
 * and calculate fit quality scores
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cluster0.b4wapis.mongodb.net';
const DB_NAME = 'ai_funding';
const COLLECTION_NAME = 'funding_programs';

/**
 * Calculate fit score between business and program
 */
function calculateFitScore(business, program) {
  let score = 0;
  let maxScore = 0;
  const details = [];

  // 1. Geographic Match (20 points) - MANDATORY
  maxScore += 20;
  if (program.eligibility.geographic.required_locations.includes(business.location)) {
    score += 20;
    details.push('✅ Geographic match (+20)');
  } else {
    details.push('❌ Geographic mismatch (0/20)');
    return { score: 0, maxScore, percentage: 0, details, verdict: 'INELIGIBLE' }; // Hard stop
  }

  // 2. Entity Type Match (15 points) - MANDATORY
  maxScore += 15;
  if (program.eligibility.entity_types.includes(business.entity_type)) {
    score += 15;
    details.push('✅ Entity type match (+15)');
  } else {
    details.push('❌ Entity type mismatch (0/15)');
    return { score: 0, maxScore, percentage: 0, details, verdict: 'INELIGIBLE' };
  }

  // 3. Sector Match (20 points)
  maxScore += 20;
  if (program.eligibility.sectors.mode === 'open') {
    score += 15;
    details.push('✅ All sectors accepted (+15)');
  } else if (program.eligibility.sectors.allowed.includes(business.sector)) {
    score += 20;
    details.push('✅ Sector match (+20)');
  } else {
    details.push('❌ Sector not eligible (0/20)');
    return { score: 0, maxScore, percentage: 0, details, verdict: 'INELIGIBLE' };
  }

  // 4. Stage Match (15 points)
  maxScore += 15;
  if (!program.eligibility.stage.allowed || program.eligibility.stage.allowed.length === 0) {
    score += 15;
    details.push('✅ All stages accepted (+15)');
  } else if (program.eligibility.stage.allowed.includes(business.stage)) {
    score += 15;
    details.push('✅ Stage match (+15)');
  } else {
    details.push('⚠️ Stage mismatch (0/15)');
  }

  // 5. Revenue Check (10 points)
  maxScore += 10;
  if (!program.eligibility.revenue.max || business.revenue <= program.eligibility.revenue.max) {
    score += 10;
    details.push('✅ Revenue within limits (+10)');
  } else {
    details.push('❌ Revenue too high (0/10)');
    return { score: 0, maxScore, percentage: 0, details, verdict: 'INELIGIBLE' };
  }

  // 6. Funding Raised Check (10 points)
  maxScore += 10;
  const fundingMax = program.eligibility.funding_raised?.max;
  if (!fundingMax || business.funding_raised <= fundingMax) {
    score += 10;
    details.push('✅ Funding raised within limits (+10)');
  } else {
    details.push('❌ Too much funding raised (0/10)');
    return { score: 0, maxScore, percentage: 0, details, verdict: 'INELIGIBLE' };
  }

  // 7. Priority Sector Bonus (10 points)
  maxScore += 10;
  if (program.eligibility.sectors.priority?.includes(business.sector)) {
    score += 10;
    details.push('⭐ Priority sector bonus (+10)');
  } else {
    details.push('ℹ️ Not a priority sector (0/10)');
  }

  const percentage = Math.round((score / maxScore) * 100);
  let verdict;
  if (percentage >= 90) verdict = 'EXCELLENT FIT';
  else if (percentage >= 75) verdict = 'GOOD FIT';
  else if (percentage >= 60) verdict = 'MODERATE FIT';
  else verdict = 'WEAK FIT';

  return { score, maxScore, percentage, details, verdict };
}

/**
 * Find and rank programs for a business
 */
async function findMatchingPrograms(business) {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Basic filter query (hard requirements)
    const query = {
      'eligibility.geographic.required_locations': business.location,
      'eligibility.entity_types': business.entity_type
    };

    const programs = await collection.find(query).toArray();

    // Calculate scores for each program
    const scored = programs.map(program => ({
      program,
      fit: calculateFitScore(business, program)
    }));

    // Filter out ineligible and sort by score
    const eligible = scored
      .filter(p => p.fit.verdict !== 'INELIGIBLE')
      .sort((a, b) => b.fit.percentage - a.fit.percentage);

    return { eligible, ineligible: scored.filter(p => p.fit.verdict === 'INELIGIBLE') };

  } finally {
    await client.close();
  }
}

/**
 * Format and display results
 */
function displayResults(business, results) {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FUNDING PROGRAM MATCHER');
  console.log('='.repeat(70));

  console.log('\n📋 BUSINESS PROFILE:');
  console.log(`  Location: ${business.location}`);
  console.log(`  Entity Type: ${business.entity_type}`);
  console.log(`  Sector: ${business.sector}`);
  console.log(`  Stage: ${business.stage}`);
  console.log(`  Revenue: $${business.revenue.toLocaleString()}`);
  console.log(`  Funding Raised: $${business.funding_raised.toLocaleString()}`);

  console.log('\n' + '='.repeat(70));
  console.log(`✅ FOUND ${results.eligible.length} MATCHING PROGRAMS\n`);

  results.eligible.forEach((result, idx) => {
    const { program, fit } = result;

    console.log(`${idx + 1}. ${program.name} (${program.short_name})`);
    console.log(`   ${'▓'.repeat(Math.floor(fit.percentage / 5))}${'░'.repeat(20 - Math.floor(fit.percentage / 5))} ${fit.percentage}%`);
    console.log(`   ${fit.verdict}\n`);

    console.log(`   Funding: $${program.funding.amounts.min?.toLocaleString() || 0} - $${program.funding.amounts.max?.toLocaleString() || 'TBD'} ${program.funding.amounts.currency}`);
    console.log(`   Type: ${program.program_type}`);
    console.log(`   Status: ${program.status.current_status}`);
    if (program.status.next_intake_opens) {
      console.log(`   Next Intake: ${program.status.next_intake_opens}`);
    }

    console.log('\n   Score Breakdown:');
    fit.details.forEach(detail => console.log(`     ${detail}`));

    console.log(`\n   📞 Contact: ${program.contacts[0]?.email || 'See website'}`);
    console.log(`   🔗 ${program.website}\n`);
    console.log('   ' + '-'.repeat(66) + '\n');
  });

  if (results.ineligible.length > 0) {
    console.log(`\n❌ ${results.ineligible.length} PROGRAM(S) INELIGIBLE:`);
    results.ineligible.forEach(result => {
      console.log(`   • ${result.program.name} - ${result.fit.details[result.fit.details.length - 1]}`);
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// Example business profiles
const exampleBusinesses = {
  nsStartup: {
    name: 'Halifax AI Startup',
    location: 'CA-NS',
    entity_type: 'for-profit',
    sector: 'software_ai',
    stage: 'mvp',
    revenue: 150000,
    funding_raised: 50000,
    employees: 3
  },

  nsManufacturer: {
    name: 'Truro Manufacturing Co.',
    location: 'CA-NS',
    entity_type: 'for-profit',
    sector: 'manufacturing',
    stage: 'established',
    revenue: 5000000,
    funding_raised: 0,
    employees: 45
  },

  frenchResearcher: {
    name: 'Paris AI Researcher',
    location: 'FR',
    entity_type: 'academic',
    sector: 'ai',
    stage: 'idea',
    revenue: 0,
    funding_raised: 0,
    employees: 1
  }
};

// Run example
async function main() {
  const business = exampleBusinesses.nsStartup; // Change to test different profiles

  console.log(`\nAnalyzing: ${business.name}...\n`);

  const results = await findMatchingPrograms(business);
  displayResults(business, results);
}

main().catch(console.error);
