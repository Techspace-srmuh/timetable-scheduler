This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Scheduling assistant

Chronos sends timetable generation requests to the FastAPI and OR-Tools
scheduler at `http://localhost:8000`. Start it in a second terminal:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn ortools
uvicorn main:app --reload --port 8000
```

The Preferences page separates required unavailable days and time ranges from
soft preferences such as the preferred day window, breaks, compact days, gaps,
and course periods. The solver rejects hard conflicts and returns a preview;
the current timetable is changed only after the student applies that preview.
The Calendar page also supports individual move previews and exports the
applied timetable as a weekly `.ics` file.

Courses, preferences, and the applied timetable are stored in the current
browser's local storage; they are not synchronized to an account or another
device. Automatic reminders are not available because the app has no reliable
background notification service. The existing assistant needs the server-side
OpenAI configuration below to answer using the supplied planner snapshot.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Chronos assistant setup

The sidebar assistant sends messages to the server-side `/api/assistant` route.
To enable AI replies locally, add your OpenAI credentials to the ignored
`.env.local` file in the project root:

```dotenv
OPENAI_API_KEY=your-server-side-api-key
OPENAI_CHAT_MODEL=your-enabled-model-id
```

Use a model available to your OpenAI account. Do not add either variable with a
`NEXT_PUBLIC_` prefix or send the API key to the browser. Restart the
development server after changing `.env.local`. For a deployment, add both
variables through that hosting provider's server-side environment settings.
Until configured, the assistant reports that its AI provider is unavailable
instead of generating placeholder replies.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
