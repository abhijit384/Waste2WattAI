# Waste2Watt AI — hackathon pitch and demo

## One-minute pitch

Waste2Watt AI helps teams build a reliable record of what they discard before asking what it could become. A user signs in, captures or selects a waste photo, records an approximate quantity and source, and gets a private, owner-scoped scan history. The platform keeps evidence and uncertainty visible: unavailable analysis stays unavailable, while scenario math is labeled as a simulation. Its AWS-native foundation uses Cognito, private S3 uploads, API Gateway, Lambda, DynamoDB and an event-driven analysis workflow. A local, rights-reviewed image research pipeline and deterministic analytics extend the product without pretending an unvalidated model knows what is recyclable or how much energy a facility will produce.

## Three-minute live demo

1. **Start at the hosted sign-in and dashboard.** Show the verified Cognito session and recent scan records. Explain that the displayed quantity is user-entered and approximate.
2. **Create a scan.** Select a safe sample image, add a quantity/source, and show upload progress over HTTPS. Revisit the private history record. Where analysis is disabled or unavailable, point out the explicit status rather than a fabricated classification.
3. **Open the Digital Waste Twin.** Explain the time and source summaries as descriptive aggregates of the signed-in user's loaded records. Source labels are not geospatially verified hotspots; energy and carbon remain unavailable without comparable cited evidence.
4. **Open the scenario simulator.** Enter a value only from a cited source, its version/table, a bounded range and an energy basis. Show the arithmetic output with the `SIMULATED` label and limitations. The app does not claim the source was independently validated.
5. **Open the sustainability advisor.** Show deterministic read-only prompts based on recent record counts and status. No live model is connected and no action is taken on the user's behalf.
6. **Close on safety and next steps.** Images remain private and data is owner-scoped. The research model is a local benchmark with five classes, not a production classifier. Bedrock access remains blocked, inference is disabled, and no result or environmental benefit is invented.

## Evidence-led product claims

- The live product supports Cognito signup/confirmation/sign-in, owner-scoped scans, constrained image uploads and history; Android manual acceptance was user-confirmed for camera, gallery, upload, persistence and history flows.
- The disabled analysis workflow returns `ANALYSIS_UNAVAILABLE` instead of claiming a successful classification.
- The local image pipeline reports actual publisher checksums, cleaned/split counts and held-out metrics in its generated ignored `evaluation.json`; the aggregate result should be presented only after the run is complete.
- Exact image-use provenance is recorded in `ml/DATASET_MANIFEST.md`. TrashNet++ and RealWaste are excluded for rights uncertainty.
- No energy yield, diversion, CO₂e savings, model accuracy or facility suitability should be claimed beyond the cited, scope-matched evidence on screen.
