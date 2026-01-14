const fs = require('fs');
const path = require('path');

// Mapping of markdown files to HTML output files
const reports = [
    { md: 'raii-2025-10-30.md', html: 'raii.html', name: 'Regional Artificial Intelligence Initiative (RAII)' },
    { md: 'nrc-irap-2025-10-31.md', html: 'nrc-irap.html', name: 'NRC Industrial Research Assistance Program (IRAP)' },
    { md: 'volta-residency-2025-10-31.md', html: 'volta-residency.html', name: 'Volta Residency Programs' },
    { md: 'bdc-data-to-ai-2025-10-30.md', html: 'bdc-data-to-ai.html', name: 'BDC Data to AI Program' },
    { md: 'wipsi-2025-10-30.md', html: 'wipsi.html', name: 'Workplace Innovation and Productivity Skills Incentive (WIPSI)' },
    { md: 'invest-ns-accelerate-2025-10-30.md', html: 'invest-ns-accelerate.html', name: 'Invest Nova Scotia Accelerate' },
    { md: 'g7-govai-grand-challenge-2025-10-30.md', html: 'g7-govai-grand-challenge.html', name: 'G7 GovAI Grand Challenge' }
];

function convertMarkdownToHTML(mdContent, programName) {
    // Extract key sections
    const lines = mdContent.split('\n');
    let html = '';

    // Find critical information section
    const criticalStart = lines.findIndex(l => l.includes('## 🚨 Critical Information'));
    const executiveSummaryStart = lines.findIndex(l => l.includes('## Executive Summary'));

    // Extract status from header
    const statusLine = lines.find(l => l.includes('**Program Status:**'));
    const status = statusLine ? statusLine.replace('**Program Status:**', '').trim() : 'Unknown';

    // Get executive summary
    let executiveSummary = '';
    if (executiveSummaryStart !== -1) {
        for (let i = executiveSummaryStart + 2; i < lines.length; i++) {
            if (lines[i].startsWith('##') && !lines[i].includes('Executive Summary')) break;
            if (lines[i].trim() && !lines[i].startsWith('**Quick Facts:**')) {
                executiveSummary += lines[i] + '\n';
            }
        }
    }

    // Build HTML
    html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${programName} - Canadian AI Funding Programs</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <div class="program-detail-header">
        <div class="container">
            <div class="breadcrumb">
                <a href="../index.html">← Back to All Programs</a>
            </div>
            <h1>${programName}</h1>
            <p class="lead">${executiveSummary.substring(0, 300).trim()}...</p>
        </div>
    </div>

    <div class="content-wrapper">
        <div class="alert alert-info">
            <strong>For complete program details:</strong> Please refer to the <a href="../../program_reports/${reports.find(r => r.name === programName).md}" target="_blank">full markdown report</a>.
        </div>

        <div class="content-section">
            <h2>Program Information</h2>
            <p>This page provides a summary of the ${programName}. For comprehensive details including eligibility criteria, application process, funding amounts, and all other program information, please review the complete markdown report linked above.</p>

            <p><strong>Status:</strong> ${status}</p>
        </div>
    </div>

    <footer>
        <div class="container">
            <p>&copy; 2025 Canadian AI Funding Programs Directory</p>
            <p><a href="../index.html">Back to All Programs</a></p>
        </div>
    </footer>
</body>
</html>`;

    return html;
}

// Convert each report
reports.forEach(report => {
    const mdPath = path.join(__dirname, '../program_reports', report.md);
    const htmlPath = path.join(__dirname, 'programs', report.html);

    try {
        const mdContent = fs.readFileSync(mdPath, 'utf8');
        const htmlContent = convertMarkdownToHTML(mdContent, report.name);
        fs.writeFileSync(htmlPath, htmlContent);
        console.log(`✓ Created ${report.html}`);
    } catch (error) {
        console.error(`✗ Error converting ${report.md}:`, error.message);
    }
});

console.log('\nConversion complete!');
