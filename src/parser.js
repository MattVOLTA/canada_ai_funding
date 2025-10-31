/**
 * Funding Program Report Parser
 * Extracts structured data from markdown reports
 */

import fs from 'fs';
import path from 'path';

export class FundingReportParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.lines = this.content.split('\n');
  }

  /**
   * Parse the entire report and return structured data
   */
  parse() {
    const programName = this.extractProgramName();
    const metadata = this.extractMetadata();
    const executiveSummary = this.extractExecutiveSummary();
    const eligibility = this.extractEligibility();
    const funding = this.extractFunding();
    const timeline = this.extractTimeline();
    const contacts = this.extractContacts();
    const status = this.extractStatus();

    return {
      program_id: this.generateProgramId(programName),
      slug: this.slugify(programName),
      name: programName,
      short_name: this.extractShortName(programName),
      version: "1.0",
      administering_agency: this.extractAdministeringAgency(executiveSummary),
      program_type: this.determineProgramType(programName, executiveSummary),
      website: this.extractWebsite(),
      contacts: contacts,
      status: status,
      timeline: timeline,
      eligibility: eligibility,
      funding: funding,
      metadata: {
        ...metadata,
        source_file: path.basename(this.filePath)
      },
      search_keywords: this.generateSearchKeywords(programName, executiveSummary)
    };
  }

  /**
   * Extract program name from title
   */
  extractProgramName() {
    const titleLine = this.lines.find(line => line.startsWith('# Program Research Report:'));
    if (!titleLine) return null;
    return titleLine.replace('# Program Research Report:', '').trim();
  }

  /**
   * Extract metadata from header
   */
  extractMetadata() {
    const metadata = {};
    const headerLines = this.lines.slice(0, 10);

    for (const line of headerLines) {
      if (line.startsWith('**Research Date:**')) {
        metadata.research_date = line.split('**Research Date:**')[1].trim();
      }
      if (line.startsWith('**Completeness Score:**')) {
        metadata.completeness_score = parseInt(line.match(/(\d+)\/100/)?.[1] || 0);
      }
      if (line.startsWith('**Data Quality Score:**')) {
        metadata.data_quality_score = parseInt(line.match(/(\d+)\/100/)?.[1] || 0);
      }
    }

    metadata.last_updated = new Date().toISOString().split('T')[0];
    return metadata;
  }

  /**
   * Extract executive summary
   */
  extractExecutiveSummary() {
    return this.extractSection('## Executive Summary');
  }

  /**
   * Extract eligibility criteria
   */
  extractEligibility() {
    const eligibilityText = this.extractSection('## Eligibility Criteria');
    const whoQualifies = this.extractSubsection('### Who Qualifies (Mandatory Requirements)');
    const disqualifiers = this.extractSubsection('### Who Does NOT Qualify (Disqualifiers)');

    return {
      geographic: this.parseGeographic(whoQualifies),
      entity_types: this.parseEntityTypes(whoQualifies),
      sectors: this.parseSectors(whoQualifies),
      stage: this.parseStage(whoQualifies),
      revenue: this.parseRevenue(whoQualifies),
      employees: this.parseEmployees(whoQualifies),
      funding_raised: this.parseFundingRaised(whoQualifies),
      ownership_requirements: this.parseOwnership(whoQualifies),
      other_requirements: this.parseOtherRequirements(whoQualifies)
    };
  }

  /**
   * Extract funding details
   */
  extractFunding() {
    const fundingSection = this.extractSection('## Funding Details');
    const amountsSection = this.extractSubsection('### Funding Amounts');
    const typeSection = this.extractSubsection('### Funding Type and Terms');

    return {
      type: this.parseFundingType(typeSection),
      amounts: this.parseFundingAmounts(amountsSection),
      repayable: this.parseRepayable(typeSection),
      equity_taken: this.parseEquityTaken(typeSection),
      disbursement: this.parseDisbursement(typeSection)
    };
  }

  /**
   * Extract timeline information
   */
  extractTimeline() {
    const timelineSection = this.extractSection('## Deadlines and Timelines');
    const estimatesSection = this.extractSubsection('### Timeline Estimates');

    return {
      application_to_decision_weeks: this.parseTimelineRange(estimatesSection, 'Application to Decision'),
      project_duration_months: this.parseProjectDuration(estimatesSection),
      total_program_duration_months: this.parseTotalDuration(estimatesSection)
    };
  }

  /**
   * Extract contact information
   */
  extractContacts() {
    const contactSection = this.extractSection('## Contact Information');
    const contacts = [];

    // Look for primary contact patterns
    const nameMatch = contactSection.match(/\*\*Name:\*\*\s+(.+)/);
    const titleMatch = contactSection.match(/\*\*Title:\*\*\s+(.+)/);
    const emailMatch = contactSection.match(/\*\*Email:\*\*\s+([\w\.-]+@[\w\.-]+\.\w+)/);
    const phoneMatch = contactSection.match(/\*\*Phone:\*\*\s+([\d\-\.\(\)\s]+)/);

    if (nameMatch || emailMatch) {
      contacts.push({
        name: nameMatch?.[1] || 'Program Contact',
        title: titleMatch?.[1] || '',
        email: emailMatch?.[1] || '',
        phone: phoneMatch?.[1] || null,
        primary: true
      });
    }

    return contacts;
  }

  /**
   * Extract status and deadline information
   */
  extractStatus() {
    const criticalInfo = this.extractSection('## 🚨 Critical Information');
    const deadlineSection = this.extractSection('## Deadlines and Timelines');

    return {
      accepting_applications: this.parseAcceptingApplications(criticalInfo),
      current_status: this.parseCurrentStatus(criticalInfo),
      next_intake_opens: this.parseNextIntakeOpens(criticalInfo, deadlineSection),
      next_deadline: this.parseNextDeadline(criticalInfo, deadlineSection),
      intake_pattern: this.parseIntakePattern(deadlineSection),
      intake_frequency_months: this.parseIntakeFrequency(deadlineSection)
    };
  }

  // ==================== HELPER PARSING METHODS ====================

  parseGeographic(text) {
    const locations = [];
    if (text.includes('Nova Scotia')) locations.push('CA-NS');
    if (text.includes('Canada') && !text.includes('Nova Scotia')) locations.push('CA');
    if (text.includes('G7')) {
      locations.push('CA', 'US', 'GB', 'FR', 'DE', 'IT', 'JP');
    }
    if (text.includes('EU')) locations.push('EU');

    return {
      required_locations: locations,
      allowed_countries: locations.filter(l => l.length === 2),
      restrictions: {}
    };
  }

  parseEntityTypes(text) {
    const types = [];
    if (text.match(/for-profit|businesses/i)) types.push('for-profit');
    if (text.match(/non-profit/i)) types.push('non-profit');
    if (text.match(/industry association/i)) types.push('industry_association');
    if (text.match(/sector council/i)) types.push('sector_council');
    if (text.match(/individual/i)) types.push('individual');
    if (text.match(/academic|researcher/i)) types.push('academic');
    return types;
  }

  parseSectors(text) {
    const sectorKeywords = {
      'agriculture_tech': /agtech|agriculture|food production/i,
      'clean_tech': /cleantech|clean tech|sustainability|environmental/i,
      'health_tech': /healthtech|health tech|medical|therapeutics/i,
      'ocean_tech': /oceantech|ocean tech|marine|fisheries/i,
      'software_ai': /software|ai|artificial intelligence|digital/i,
      'govtech': /govtech|government|public sector/i
    };

    const allowed = [];
    const priority = [];

    for (const [sector, regex] of Object.entries(sectorKeywords)) {
      if (regex.test(text)) {
        allowed.push(sector);
        if (text.match(new RegExp(`priority.*${sector}`, 'i'))) {
          priority.push(sector);
        }
      }
    }

    return {
      mode: allowed.length > 0 ? 'restricted' : 'open',
      allowed: allowed,
      priority: priority
    };
  }

  parseStage(text) {
    const stages = [];
    if (text.match(/idea|pre-product/i)) stages.push('idea');
    if (text.match(/mvp|minimum viable product/i)) stages.push('mvp');
    if (text.match(/poc|proof of concept/i)) stages.push('poc');
    if (text.match(/early revenue|early-stage/i)) stages.push('early_revenue');
    if (text.match(/established|operating/i)) stages.push('established');

    return {
      mode: stages.length === 0 ? 'any' : 'restricted',
      allowed: stages,
      min_stage: stages[0] || null,
      description: ''
    };
  }

  parseRevenue(text) {
    const maxMatch = text.match(/revenue.*?less than.*?\$?([\d,]+)M?/i);
    return {
      min: null,
      max: maxMatch ? this.parseNumber(maxMatch[1]) : null,
      currency: 'CAD'
    };
  }

  parseEmployees(text) {
    return { min: null, max: null };
  }

  parseFundingRaised(text) {
    const maxMatch = text.match(/raised.*?less than.*?\$?([\d,]+)K?/i);
    return {
      min: null,
      max: maxMatch ? this.parseNumber(maxMatch[1]) : null,
      currency: 'CAD'
    };
  }

  parseOwnership(text) {
    const percentMatch = text.match(/(\d+)%\s+owner/i);
    return {
      minimum_ownership_percentage: percentMatch ? parseInt(percentMatch[1]) : null,
      must_be_majority_owner: text.includes('majority owner'),
      full_time_commitment: text.includes('full-time')
    };
  }

  parseOtherRequirements(text) {
    return [];
  }

  parseFundingType(text) {
    if (text.match(/grant/i)) return 'grant';
    if (text.match(/loan/i)) return 'loan';
    if (text.match(/equity/i)) return 'equity';
    if (text.match(/accelerator/i)) return 'accelerator';
    if (text.match(/prize|competition/i)) return 'prize';
    return 'grant';
  }

  parseFundingAmounts(text) {
    const maxMatch = text.match(/\$?([\d,]+)K?\s*(?:CAD|per|maximum)/i);
    const coverageMatch = text.match(/(\d+)%\s+of/i);

    return {
      min: 0,
      max: maxMatch ? this.parseNumber(maxMatch[1]) : null,
      typical_range: { min: null, max: null },
      currency: 'CAD',
      coverage_rate: coverageMatch ? parseInt(coverageMatch[1]) / 100 : 1,
      applicant_contribution_required: coverageMatch ? 1 - (parseInt(coverageMatch[1]) / 100) : 0
    };
  }

  parseRepayable(text) {
    return text.match(/non-repayable|not repayable/i) ? false : null;
  }

  parseEquityTaken(text) {
    return text.match(/non-dilutive|no equity/i) ? false : null;
  }

  parseDisbursement(text) {
    return {
      method: text.match(/reimbursement/i) ? 'reimbursement' : 'advance',
      schedule: 'milestone_based'
    };
  }

  parseAcceptingApplications(text) {
    return text.match(/status.*?open/i) ? true : false;
  }

  parseCurrentStatus(text) {
    if (text.match(/status.*?closed/i)) return 'closed';
    if (text.match(/status.*?open/i)) return 'open';
    if (text.match(/future|not yet/i)) return 'future';
    return 'closed';
  }

  parseNextIntakeOpens(criticalInfo, deadlineSection) {
    const dateMatch = (criticalInfo + deadlineSection).match(/(?:opens|next intake).*?(\w+ \d+,? \d{4}|\d{4}-\d{2}-\d{2})/i);
    return dateMatch ? this.parseDate(dateMatch[1]) : null;
  }

  parseNextDeadline(criticalInfo, deadlineSection) {
    const dateMatch = (criticalInfo + deadlineSection).match(/deadline.*?(\w+ \d+,? \d{4}|\d{4}-\d{2}-\d{2})/i);
    return dateMatch ? this.parseDate(dateMatch[1]) : null;
  }

  parseIntakePattern(text) {
    if (text.match(/continuous/i)) return 'continuous';
    if (text.match(/bi-annual|twice\s+(?:per\s+)?year/i)) return 'bi-annual';
    if (text.match(/annual|once\s+(?:per\s+)?year/i)) return 'seasonal';
    if (text.match(/one-time|single/i)) return 'one-time';
    return 'seasonal';
  }

  parseIntakeFrequency(text) {
    const months = [];
    if (text.match(/april/i)) months.push(4);
    if (text.match(/june/i)) months.push(6);
    if (text.match(/october/i)) months.push(10);
    return months;
  }

  parseTimelineRange(text, label) {
    const match = text.match(new RegExp(`${label}.*?(\\d+)-(\\d+)\\s+weeks?`, 'i'));
    if (match) {
      return { min: parseInt(match[1]), max: parseInt(match[2]) };
    }
    return { min: null, max: null };
  }

  parseProjectDuration(text) {
    const match = text.match(/project duration.*?(\d+)\s+months?/i);
    return match ? parseInt(match[1]) : null;
  }

  parseTotalDuration(text) {
    const match = text.match(/total.*?(\d+)\s+months?/i);
    return match ? parseInt(match[1]) : null;
  }

  // ==================== UTILITY METHODS ====================

  extractSection(heading) {
    const startIdx = this.lines.findIndex(line => line.trim() === heading);
    if (startIdx === -1) return '';

    let endIdx = this.lines.findIndex((line, idx) =>
      idx > startIdx && line.startsWith('## ') && line !== heading
    );
    if (endIdx === -1) endIdx = this.lines.length;

    return this.lines.slice(startIdx, endIdx).join('\n');
  }

  extractSubsection(heading) {
    const startIdx = this.lines.findIndex(line => line.trim() === heading);
    if (startIdx === -1) return '';

    let endIdx = this.lines.findIndex((line, idx) =>
      idx > startIdx && line.match(/^###?\s/) && line !== heading
    );
    if (endIdx === -1) endIdx = this.lines.length;

    return this.lines.slice(startIdx, endIdx).join('\n');
  }

  extractWebsite() {
    const websiteMatch = this.content.match(/https?:\/\/[^\s\)]+/);
    return websiteMatch ? websiteMatch[0] : null;
  }

  extractShortName(fullName) {
    const acronymMatch = fullName.match(/\(([A-Z]+)\)/);
    return acronymMatch ? acronymMatch[1] : fullName.split(' ').map(w => w[0]).join('');
  }

  extractAdministeringAgency(text) {
    const agencyMatch = text.match(/\*\*Administered by:\*\*\s+(.+)/);
    if (!agencyMatch) return { name: '', jurisdiction: 'unknown', province: null, country: 'CA' };

    const name = agencyMatch[1].trim();
    const isProvincial = name.match(/Nova Scotia|NS/i);
    const isFederal = name.match(/Canada|Federal|Treasury Board/i);

    return {
      name: name,
      jurisdiction: isProvincial ? 'provincial' : isFederal ? 'federal' : 'unknown',
      province: isProvincial ? 'NS' : null,
      country: 'CA'
    };
  }

  determineProgramType(name, summary) {
    if (name.match(/accelerate|accelerator/i)) return 'accelerator';
    if (name.match(/challenge|competition/i)) return 'competition';
    if (summary.match(/grant/i)) return 'grant';
    return 'grant';
  }

  generateProgramId(name) {
    const slug = this.slugify(name);
    if (name.match(/nova scotia|NS/i)) return `ca-ns-${slug}`;
    if (name.match(/G7/i)) return `ca-g7-${slug}`;
    return `ca-${slug}`;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  generateSearchKeywords(name, summary) {
    const keywords = new Set();

    // Add name words
    name.toLowerCase().split(/\s+/).forEach(w => {
      if (w.length > 3) keywords.add(w);
    });

    // Add key terms
    if (summary.match(/startup|early-stage/i)) keywords.add('startup');
    if (summary.match(/training|workforce/i)) keywords.add('training');
    if (summary.match(/accelerator/i)) keywords.add('accelerator');
    if (summary.match(/ai|artificial intelligence/i)) keywords.add('ai');
    if (summary.match(/innovation/i)) keywords.add('innovation');

    return Array.from(keywords);
  }

  parseNumber(str) {
    // Handle formats like "1,000,000" or "250K" or "1M"
    str = str.replace(/,/g, '');
    if (str.endsWith('K')) return parseInt(str) * 1000;
    if (str.endsWith('M')) return parseInt(str) * 1000000;
    return parseInt(str);
  }

  parseDate(dateStr) {
    // Handle formats like "June 24, 2025" or "2025-06-24"
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    const date = new Date(dateStr);
    if (!isNaN(date)) {
      return date.toISOString().split('T')[0];
    }
    return null;
  }
}
