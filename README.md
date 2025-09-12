# Synapse - AI Spare Parts Intelligence

A modern React application for AI-powered spare parts intelligence and assembly machine maintenance.

## Features

- AI chatbot for spare parts identification
- Visual recognition capabilities
- Real-time inventory management
- Microsoft Teams integration
- SharePoint integration
- Modern, responsive UI with shadcn/ui components

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React 18** - Modern React with hooks
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Radix UI** - Headless UI primitives

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <YOUR_REPOSITORY_URL>
cd synapse-spare-parts
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── pages/              # Page components
└── main.tsx           # Application entry point
```

## Development

The project uses:
- **ESLint** for code linting
- **TypeScript** for type checking
- **Tailwind CSS** for styling
- **Vite** for fast development and building

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Static Hosting
The built files in the `dist` directory can be deployed to any static hosting service like:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.