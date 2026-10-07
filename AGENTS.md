# Waste2Watt AI engineering rules

- Keep all project files, caches, environments, and build outputs inside `E:\Waste2WattAI`.
- Current scope is scaffolding, shared contracts, and placeholder boundaries only.
- Do not deploy, bootstrap, create AWS resources, invoke models, or upload data without
  a new explicit user instruction authorizing that work.
- Target AWS-native services: Cognito, S3, API Gateway, Lambda, DynamoDB, EventBridge,
  Step Functions, Bedrock, SageMaker AI, Strands Agents SDK, CloudWatch, CDK v2 TypeScript.
- Use React, Vite, TypeScript, and Tailwind for the frontend; Node.js TypeScript for
  API Lambda handlers; Python for AI/ML and agents.
- Do not use Firebase, Supabase, MongoDB Atlas, Gemini API, OpenAI API, or Cloudinary.
- Add dependencies only for implemented work. No CDK, AWS SDK, ML, or agent runtime
  packages are needed for this scaffold.
- Never invent sustainability conversion factors, yields, emissions savings, or
  accuracy claims. Unknown estimates are null; retain evidence and limitations.
- Keep TS/Python wire contracts aligned. They provide type hints, not runtime validation.
- Never commit secrets, local environment files, uploaded data, or model artifacts.
- Future authorization must derive ownership from validated Cognito identity, rather
  than trusting an ownerId supplied by a browser.
- Run `npm run check` after relevant changes. Python formatting/linting uses Ruff;
  tests use Node's built-in runner and Python unittest. Record checks honestly.
- Do not turn placeholders into simulated successful business operations.
