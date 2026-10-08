# Waste2Watt AI engineering rules

- Keep all project files, caches, environments, and build outputs inside `E:\Waste2WattAI`.
- Current scope includes Phase 3 Cognito UI, owned scan APIs, constrained uploads and pipeline status persistence.
- Do not deploy, bootstrap, create AWS resources, invoke models, or upload data without
  a new explicit user instruction authorizing that work.
- Target AWS-native services: Cognito, S3, API Gateway, Lambda, DynamoDB, EventBridge,
  Step Functions, Bedrock, SageMaker AI, Strands Agents SDK, CloudWatch, CDK v2 TypeScript.
- Use React, Vite, TypeScript, and Tailwind for the frontend; Node.js TypeScript for
  API Lambda handlers; Python for AI/ML and agents.
- Do not use Firebase, Supabase, MongoDB Atlas, OpenAI API, or Cloudinary.
- External AI inference is allowed only under the user's explicit zero-cost policy:
  paid external usage must remain false, the maximum external AI cost is USD 0,
  and only a currently verified free model/account/quota may be used. Unknown or
  changed pricing disables that provider. Require explicit external-processing
  consent for any image sent outside AWS. Keep external inference disabled by
  default; Bedrock remains subject to its separate AWS authorization/spending gate.
- Add dependencies only for implemented work. CDK and local bundling are authorized;
  Amplify and AWS SDK v3 are authorized in Phase 3. Do not add AI provider SDKs until
  a free model and account are verified and its adapter is being implemented.
- Local `cdk synth --lookups false` is authorized. Deployment and all AWS account
  changes still require a new explicit instruction.
- Never invent sustainability conversion factors, yields, emissions savings, or
  accuracy claims. Unknown estimates are null; retain evidence and limitations.
- Phase 3 scan contracts use shared Zod runtime schemas. Legacy Python AI contracts
  remain deferred and must be aligned when analysis is implemented.
- Never commit secrets, local environment files, uploaded data, or model artifacts.
- Treat any API key pasted into chat, prompts, attachments, terminal output or logs as
  compromised. Never reuse it; revoke/rotate it through the provider and enter its
  replacement only through an approved secure interactive flow.
- Future authorization must derive ownership from validated Cognito identity, rather
  than trusting an ownerId supplied by a browser.
- Run `npm run check` after relevant changes. Python formatting/linting uses Ruff;
  tests use Node's built-in runner and Python unittest. Record checks honestly.
- Do not turn placeholders into simulated successful business operations.
