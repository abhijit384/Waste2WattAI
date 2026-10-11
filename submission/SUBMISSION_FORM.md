# Hackathon form copy

## Project name

Waste2Watt AI

## Tagline

Turning waste intelligence into energy decisions.

## Project description

Waste2Watt AI is an AWS-hosted, authenticated workflow for recording waste observations and exploring recovery decisions with visible evidence and uncertainty. Users capture or select a photo, enter an approximate quantity and source, upload to private S3, and follow owner-scoped scan history through an event-driven backend. A dashboard and Digital Waste Twin summarize recorded scans; a cited-input simulator keeps hypothetical calculations separate from measured outcomes. The app uses Cognito, API Gateway, Lambda, DynamoDB, S3, EventBridge, Step Functions, SQS, CloudWatch, Amplify Hosting, and CDK. It avoids fabricating classifications or environmental benefits when evidence is unavailable.

## Website

https://main.d1kq8pn2nvv063.amplifyapp.com/

## YouTube demo link (required)

Upload `assets/Waste2Watt-AI-Demo.mp4` to YouTube as **Unlisted**, then paste the resulting `https://youtu.be/...` URL here before submitting. Publishing is intentionally left to the project owner.

## Demo video

Local prepared file: `submission/assets/Waste2Watt-AI-Demo.mp4` (2:52, narrated). It includes a genuine fresh scan attempt whose analysis was unavailable; it distinguishes that attempt from an earlier stored report.

## Limitations to disclose

- Hosted model analysis is inconsistent. Bedrock access is blocked, and not every external-provider scan returns a validated result.
- Energy and carbon impacts remain unestimated without reviewed factors and baselines.
- The local image classifier is a low-performing research baseline and is not connected to production scans.
