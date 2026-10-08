# Waste2Watt AI engineering rules

- Keep all project files, caches, environments, and build outputs inside `E:\Waste2WattAI`.
- Current scope includes Phase 3 Cognito UI, owned scan APIs, constrained uploads and pipeline status persistence.
- Do not deploy, bootstrap, create AWS resources, invoke models, or upload data without
  a new explicit user instruction authorizing that work.
- Target AWS-native services: Cognito, S3, API Gateway, Lambda, DynamoDB, EventBridge,
  Step Functions, Bedrock, SageMaker AI, Strands Agents SDK, CloudWatch, CDK v2 TypeScript.
- Use React, Vite, TypeScript, and Tailwind for the frontend; Node.js TypeScript for
  API Lambda handlers; Python for AI/ML and agents.
- Do not use Firebase, Supabase, MongoDB Atlas, Gemini API, OpenAI API, or Cloudinary.
- Add dependencies only for implemented work. CDK and local bundling are authorized;
  Amplify and AWS SDK v3 are authorized in Phase 3; AI/ML remains deferred.
- Local `cdk synth --lookups false` is authorized. Deployment and all AWS account
  changes still require a new explicit instruction.
- Never invent sustainability conversion factors, yields, emissions savings, or
  accuracy claims. Unknown estimates are null; retain evidence and limitations.
- Phase 3 scan contracts use shared Zod runtime schemas. Legacy Python AI contracts
  remain deferred and must be aligned when analysis is implemented.
- Never commit secrets, local environment files, uploaded data, or model artifacts.
- Future authorization must derive ownership from validated Cognito identity, rather
  than trusting an ownerId supplied by a browser.
- Run `npm run check` after relevant changes. Python formatting/linting uses Ruff;
  tests use Node's built-in runner and Python unittest. Record checks honestly.
- Do not turn placeholders into simulated successful business operations.
