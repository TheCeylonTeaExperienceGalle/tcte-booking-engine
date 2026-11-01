# Reviva Tea Tours - Portfolio Website

A fast, responsive portfolio website for a tea-tourism operator built with Next.js 16, Tailwind CSS v4, and shadcn/ui components.

## Features

- **Modern Design**: Clean, minimal design with tea-inspired color palette (deep green, cream, light gold)
- **Fully Responsive**: Mobile-first approach with accessibility (WCAG AA compliant)
- **Fast Performance**: Static build with lazy-loaded images
- **Complete Booking System**: No database required - uses email and Google Sheets
- **SEO Optimized**: Proper meta tags, Open Graph, and semantic HTML

## Pages

1. **Home**: Hero section with CTAs
2. **Gallery**: Image grid with lightbox
3. **About**: Company story, mission, team
4. **Services**: 4 tea experience programs
5. **Contact**: Address, phone, WhatsApp, map
6. **Book Now**: Complete booking form

## Getting Started

### Installation

```bash
npm install
```

### Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:
- Email settings (Gmail recommended with App Password)
- Google Sheets webhook URL (optional)

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Configuration

### Email Setup (Gmail Example)

1. Enable 2-factor authentication on your Google account
2. Generate an App Password
3. Use the App Password in `.env.local`

### Google Sheets Integration (Optional)

See `.env.example` for instructions on setting up Google Sheets webhook.

## Customization

### Colors

Edit `app/globals.css` to change the color scheme.

### Content

- Update contact information in `components/Footer.jsx` and `app/contact/page.jsx`
- Replace placeholder images in Gallery with actual photos
- Modify service prices in `app/services/page.jsx`

## Tech Stack

- **Framework**: Next.js 16
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: React Icons
- **Date Handling**: date-fns
- **Email**: Nodemailer

## Support

For issues or questions, contact: info@ceylontea.com
