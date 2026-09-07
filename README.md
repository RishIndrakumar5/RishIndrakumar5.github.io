# Rishwanth Indrakumar - Student Portfolio

A modern, responsive portfolio website showcasing the academic achievements, projects, and aspirations of Rishwanth Indrakumar, a student at CREC Academy of Computer Science and Engineering Middle School. The displayed grade updates automatically each school year.

## Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, engaging interface with smooth animations
- **Sections Included**:
  - About Me
  - Academic Interests (Math, Science, Geometry, Engineering)
  - Projects & Creations
  - Skills & Strengths
  - Goals & Aspirations

## Getting Started

1. For normal browsing, open `index.html` in a web browser
2. To edit certificates and publish them for everyone, run:

```bash
node server.js
```

Then open http://localhost:4173/certificates.html — unlock with your passcode and click **Save**. That updates `certificates-data.js` and pushes it to GitHub so your live site shows the changes.

## File Structure

```
portfolio/
├── index.html              # Main HTML file
├── certificates.html       # Certificates display / editor
├── certificates.js         # Certificates page logic
├── certificates-data.js    # Published certificate data
├── server.js               # Local server (enables Save to portfolio)
├── styles.css              # Styling and layout
├── script.js               # Interactive features and animations
└── README.md               # This file
```

## Customization

To customize the portfolio:

- **Content**: Edit the HTML in `index.html`
- **Styling**: Modify colors, fonts, and layout in `styles.css`
- **Interactivity**: Adjust animations and behaviors in `script.js`

## Browser Support

Works on all modern browsers including:
- Chrome
- Firefox
- Safari
- Edge

## Deployment

This portfolio can be easily deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

Simply upload all files to your hosting service.

