# Business Management Hub

## Overview

This is a full-stack business management application built with React, Express.js, TypeScript, and PostgreSQL. The system provides comprehensive management capabilities for plant inventory, employee records, payroll processing, and document management. It features a modern web interface with server-side PDF generation, Excel import/export functionality, and regulatory compliance reporting.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite build system
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: React Router for client-side navigation
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Drag & Drop**: @dnd-kit for reorderable interfaces

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Express sessions with cookie-based auth
- **File Processing**: Multer for file uploads, Excel processing with XLSX
- **PDF Generation**: pdf-lib with custom font support for Greek characters
- **Template Engine**: Handlebars for PDF template rendering

## Key Components

### Plant Inventory Management
- Comprehensive plant database with scientific names, planting years, and quantities
- Bulk import/export via Excel files
- Smart search functionality with debounced queries
- Stock adjustment workflows with audit trails
- Regulatory compliance reporting (ΔΗΛΩΣΗ ΚΑΛΛΙΕΡΓΕΙΑΣ)

### Employee Management System
- Full employee lifecycle management (active/former status tracking)
- Secure storage of identification documents (passport, ARC, tax ID, social insurance)
- Payroll calculation with Cyprus tax rates (8.3% social insurance, 2.65% GESY)
- PDF payslip generation with Greek language support

### Document Center
- Categorized document storage with multilingual support (Greek/English)
- Predefined categories for business compliance:
  - Foundation documents
  - Operating licenses
  - Nursery production licenses
  - Regulatory compliance forms
  - Financial records
  - Insurance documents
  - Contracts

### Reporting & Compliance
- PDF generation with embedded Greek fonts (Noto Sans Greek)
- Cultivation declaration reports with alphabetical sorting
- Employee payslip generation with proper tax calculations
- Backup and restore functionality for data protection

## Data Flow

1. **Client Requests**: React frontend makes API calls to Express backend
2. **Authentication**: Session-based auth with httpOnly cookies
3. **Database Operations**: Drizzle ORM handles PostgreSQL interactions
4. **File Processing**: Server processes Excel imports and generates PDFs
5. **Response Handling**: JSON responses for data, binary streams for files

## External Dependencies

### Production Dependencies
- **Database**: @neondatabase/serverless for Postgres connection
- **PDF Processing**: @pdf-lib/fontkit for custom font embedding
- **UI Components**: Extensive Radix UI component suite via shadcn/ui
- **File Handling**: XLSX for Excel processing, Multer for uploads
- **Authentication**: Express-session with connect middleware

### Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Database Management**: Drizzle Kit for migrations and schema management
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Development Experience**: Replit-specific plugins for enhanced debugging

## Deployment Strategy

### Build Process
1. Frontend build via Vite (outputs to `dist/public`)
2. Backend compilation via esbuild (outputs to `dist/index.js`)
3. Database migrations via Drizzle Kit

### Environment Configuration
- **Development**: `NODE_ENV=development` with TSX for hot reloading
- **Production**: `NODE_ENV=production` with compiled JavaScript
- **Database**: Requires `DATABASE_URL` environment variable

### File Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared TypeScript types and schemas
├── migrations/      # Database migration files
└── scripts/         # Utility scripts for data seeding
```

## Changelog

Changelog:
- June 29, 2025. Initial setup
- June 29, 2025. Added auto-generate payslips feature with verification system
- June 29, 2025. Added mass print functionality for monthly payslips

## User Preferences

Preferred communication style: Simple, everyday language.