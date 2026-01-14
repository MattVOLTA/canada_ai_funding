# Canadian AI Funding Programs Website

A beautiful, responsive website showcasing Canadian AI funding programs with detailed program pages.

## 📁 Structure

```
website/
├── index.html                  # Main landing page with all programs
├── css/
│   └── style.css              # Comprehensive styling with modern design
├── js/
│   └── main.js                # Filter functionality and smooth scrolling
├── programs/                   # Individual program detail pages
│   ├── raii.html
│   ├── nrc-irap.html
│   ├── volta-residency.html
│   ├── bdc-data-to-ai.html
│   ├── wipsi.html
│   ├── invest-ns-accelerate.html
│   └── g7-govai-grand-challenge.html
└── README.md                   # This file
```

## 🚀 How to View

### Option 1: Open Directly in Browser
1. Navigate to `/Volumes/SD/ai_funding/website/`
2. Double-click `index.html` to open in your default browser
3. Browse programs and click "View Details" to see individual program pages

### Option 2: Use a Local Server (Recommended)
For the best experience with proper file paths:

```bash
cd /Volumes/SD/ai_funding/website
python3 -m http.server 8000
```

Then open your browser to: `http://localhost:8000`

### Option 3: VS Code Live Server
1. Open the `website` folder in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## ✨ Features

### Index Page (`index.html`)
- **Hero Section** with gradient header
- **Statistics Overview** showing 7 total programs, 4 active
- **Filter Buttons** to view programs by status (All, Active, Seasonal, Future)
- **Program Cards** with:
  - Status badges (Active, Seasonal, Future, Closed)
  - Geographic scope indicators
  - Funding ranges and types
  - Key details (deadlines, admin agency)
  - "View Details" buttons linking to program pages
- **Quick Reference Guide** for common use cases
- **Responsive Design** works on desktop, tablet, and mobile

### Program Detail Pages
Each program has a dedicated page with:
- **Header** with breadcrumb navigation back to index
- **Critical Information** alert boxes for important deadlines/requirements
- **Quick Facts Grid** with key program details
- **Program Overview** with description and objectives
- **Eligibility Highlights**
- **Application Process** steps
- **Contact Information**
- **Link to Full Markdown Report** for comprehensive details

### Filter Functionality
The index page includes interactive filters:
- **All Programs**: Shows all 7 programs (default)
- **Active**: Shows only currently accepting applications (RAII, NRC IRAP, Volta, BDC)
- **Seasonal**: Shows programs with periodic intakes (WIPSI, Invest NS Accelerate)
- **Future**: Shows upcoming programs (G7 GovAI Grand Challenge)

## 🎨 Design Features

### Color Scheme
- **Primary**: Blue gradient (`#667eea` to `#764ba2`)
- **Status Colors**:
  - Active: Green (`#10b981`)
  - Seasonal: Yellow/Orange (`#f59e0b`)
  - Future: Blue (`#06b6d4`)
  - Closed: Red (`#ef4444`)

### Typography
- Modern system font stack for maximum readability
- Clear hierarchy with appropriate font sizes
- Good contrast ratios for accessibility

### Cards & Components
- Hover effects with subtle lift and shadow
- Rounded corners for modern aesthetic
- Consistent spacing using CSS variables
- Responsive grid layouts

## 📱 Responsive Breakpoints

- **Desktop**: >768px (multi-column grid)
- **Tablet**: 768px (adapted grid)
- **Mobile**: <768px (single column, stacked layout)

## 🔗 Navigation

### From Index to Program Pages
Click "View Details" on any program card

### From Program Pages to Index
- Click "← Back to All Programs" in breadcrumb
- Click "Back to All Programs" in footer

### To Full Markdown Reports
Each program page includes a link to view the complete research report in markdown format

## 📊 Programs Included

1. **RAII** - Regional Artificial Intelligence Initiative ($250K-$5M, Active, National)
2. **NRC IRAP** - Industrial Research Assistance Program ($50K-$10M, Active, National)
3. **Volta Residency** - Atlantic Canada startup accelerator ($0-$25K, Active, Atlantic)
4. **BDC Data to AI** - AI adoption financing (100% of costs, Active, National)
5. **WIPSI** - Workforce training grant (75% of costs, Seasonal, Nova Scotia)
6. **Invest NS Accelerate** - Startup acceleration ($40K, Seasonal, Nova Scotia)
7. **G7 GovAI Grand Challenge** - International AI competition ($10K, Future, International)

## 🛠️ Customization

### Adding New Programs
1. Create a new HTML file in `website/programs/` using existing pages as templates
2. Add a new program card to `index.html` in the appropriate section
3. Update statistics in the stats-section if needed
4. Ensure status badges and scope badges match the design system

### Updating Content
- Edit HTML files directly - all content is static
- Update markdown reports in `program_reports/` - program pages link to them
- Modify CSS variables in `style.css` for theme changes

### Styling Changes
Edit `website/css/style.css`:
- Colors: Update CSS variables in `:root`
- Spacing: Modify spacing variables
- Fonts: Change font-family declarations

## 🌐 Deployment Options

### GitHub Pages
1. Push the `website` folder to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to the `website` folder or create a `docs` folder

### Netlify
1. Drag and drop the `website` folder to Netlify
2. Or connect your GitHub repository
3. Configure build settings (none needed for static site)

### Vercel
1. Import your project from GitHub
2. Set root directory to `website`
3. Deploy

### Traditional Web Hosting
Upload contents of `website/` folder to your web server's public directory

## 📝 Notes

- All program information is sourced from detailed markdown reports in `program_reports/`
- Links to markdown reports use relative paths (`../../program_reports/[file].md`)
- No build process required - pure HTML/CSS/JS
- JavaScript is minimal and only used for filter functionality
- Compatible with all modern browsers
- No external dependencies or frameworks

## 🔄 Maintenance

To keep the website current:
1. Update markdown reports in `program_reports/` when program details change
2. Update corresponding HTML files in `website/programs/`
3. Update status badges and dates on `index.html`
4. Regenerate if adding/removing programs

## 📧 Contact

For questions about the funding programs themselves, use the contact information provided on each program's detail page.

---

**Last Updated:** November 2025
**Programs Tracked:** 7
**Pages:** 8 HTML files (1 index + 7 program pages)
