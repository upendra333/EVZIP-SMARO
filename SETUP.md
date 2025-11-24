# EVZIP Ops Console - Setup Instructions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace the placeholder values with your actual Supabase credentials.

## Installation

Dependencies are already installed. To reinstall:

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

## Build

Build for production:

```bash
npm run build
```

## Project Structure

```
evzip-ops-console/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and Supabase client
│   └── utils/          # Helper functions
├── public/              # Static assets
└── .env                # Environment variables (create this)
```

## Next Steps

1. Set up Supabase project and database schema
2. Configure environment variables
3. Start building components (see IMPLEMENTATION_STEPS.md)

