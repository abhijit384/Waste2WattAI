# Waste2Watt AI — hackathon pitch and demo

For the complete reviewer package, see [submission/README.md](../submission/README.md).

## One-minute pitch

Waste2Watt AI helps teams create a traceable record of discarded material and explore recovery decisions responsibly. Users can verify an account, capture or select a waste photo, enter an approximate quantity and source, and review owner-scoped scan history. The AWS-native workflow combines Cognito, private S3 uploads, API Gateway, Lambda, DynamoDB and event-driven status processing. Dashboard analytics and the Digital Twin summarize recorded scans; the scenario simulator makes cited-input arithmetic explicit. The analysis service validates structured model output, but hosted inference is currently inconsistent: a recent scan ended `ANALYSIS_UNAVAILABLE`. The product keeps unknown classifications and environmental impacts unknown instead of inventing them.

## Three-minute live demo

1. **Start at the hosted home page, then sign in and open the dashboard.** Show the verified Cognito session and recent scan records. Explain that the displayed quantity is user-entered and approximate.
2. **Create a scan.** Select a safe sample image, add a quantity/source, and show upload progress over HTTPS. Revisit the private history record. Where analysis is disabled or unavailable, point out the explicit status rather than a fabricated classification.
3. **Open the Digital Waste Twin.** Explain the time and source summaries as descriptive aggregates of the signed-in user's loaded records. Source labels are not geospatially verified hotspots; energy and carbon remain unavailable without comparable cited evidence.
4. **Open the scenario simulator.** Enter a value only from a cited source, its version/table, a bounded range and an energy basis. Show the arithmetic output with the `SIMULATED` label and limitations. The app does not claim the source was independently validated.
5. **Open the sustainability advisor.** Show deterministic read-only prompts based on recent record counts and status. No live model is connected and no action is taken on the user's behalf.
6. **Close on safety and next steps.** Images remain private and data is owner-scoped. The local five-class image baseline is a research experiment, not a production classifier. Bedrock access remains blocked; external-provider results have not been reliable across scans. No result or environmental benefit is invented.

## Evidence-led product claims

- The live product supports Cognito signup/confirmation/sign-in, owner-scoped scans, constrained image uploads and history; Android manual acceptance was user-confirmed for camera, gallery, upload, persistence and history flows.
- Hosted analysis has returned one schema-validated Gemini response and separate `ANALYSIS_UNAVAILABLE` outcomes. This is evidence of a working adapter path, not a reliability guarantee.
- The local image pipeline report records publisher checksums, cleaned/split counts and held-out metrics. It reached 45.38% accuracy and 28.15% macro-F1 on a source-group holdout that has no Glass examples and only four Paper examples; it is not production-ready.
- Exact image-use provenance is recorded in `ml/DATASET_MANIFEST.md`. TrashNet++ and RealWaste are excluded for rights uncertainty.
- No energy yield, diversion, CO₂e savings, model accuracy or facility suitability should be claimed beyond the cited, scope-matched evidence on screen.
