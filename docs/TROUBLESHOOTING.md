# Operational troubleshooting

Live logs remain uninspected because deployment is pending. The new profile
returned root; correct it before deployment. Read-only quota/bootstrap/diff review
has run. Use only verified
non-root waste2watt-dev/us-east-1 and expected account. Never print/export JWTs,
Authorization, signed POST fields or credentials.

| Symptom                           | Check / resolution                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Root rejected                     | Configure waste2watt-dev as a non-root MFA developer session; previous accounts are forbidden. Keep guard intact. |
| Expired credentials               | Renew existing profile through approved sign-in; never write credentials into project.                            |
| Bootstrap lookup fails            | Distinguish absence from denied/network error; inspect required version before bootstrap.                         |
| Unexpected replacement/deletion   | Stop; compare construct IDs/strong exports. Do not delete dependent exports or retained data.                     |
| Reserved concurrency deploy error | Dev omits reservations for quota 10; staging/prod retain 10+5+5 and need a separate quota review.                 |
| Auth configuration screen         | Generate env from real outputs; verify region/client/API; restart Vite or rebuild hosting ZIP.                    |
| Confirmation email missing        | Check spam/delivery limits; resend through normal UI, never bypass ownership.                                     |
| API 401                           | Check access token, expiry, issuer, audience/client and aws.cognito.signin.user.admin scope.                      |
| CORS failure                      | Match exact scheme/host/port in API/S3; retain localhost plus real Amplify origin, no wildcard.                   |
| S3 POST 403                       | Refresh policy; preserve every field/key/type/exact length/AES256. File last; browser sets multipart boundary.    |
| Stuck UPLOADING                   | Verify actual object/version, S3 EventBridge notification, ImageCreated target/invocations and delivery DLQ.      |
| FAILED / ANALYSIS_NOT_IMPLEMENTED | Expected stub behavior; this verifies the failure path, not successful AI analysis.                               |
| Metadata rejection                | Compare version-specific Head with recorded MIME/length; content analysis does not exist.                         |
| Hosted route 404                  | Configure SPA rewrite while preserving asset paths; hard refresh protected routes.                                |

## CloudWatch inspection

Discover physical names through exact Waste2Watt stack resources rather than broad
account listings. API owns ApiLambdaLogs/HttpAccessLogs; Pipeline owns
PipelineLambdaLogs/ScanStatusLogs/StateMachineLogs. All retain 30 days. Five log
groups should exist after deploy, but streams appear only after invocation. Step
Functions logs ERROR without execution data; inspect execution history privately.

For an exact project log group and test interval use CloudWatch Console or:

```powershell
aws logs filter-log-events --log-group-name $projectLogGroup --start-time $testStartEpochMs --profile waste2watt-dev --region us-east-1
```

Correlate safe API request IDs/route/status and execution IDs/timestamps. Expected:
Phase3NotImplemented stub error, AnalysisFailed and diagnostic queue messages.
Unexpected: API 5xx, STATUS_UPDATE_FAILED, delivery failures/timeouts or persistent
PROCESSING after failure. Seven project alarms have no notification actions;
deliberate stub errors/queue backlog can alarm. Never purge queue/change thresholds
to hide errors. Inspect deployed IAM as well as templates. Check logs locally for
JWT/Authorization/signatures without saving secret-matching lines or exporting HAR.
Do not add event/header dumps while debugging.

Review usage/billing after testing. Retained S3 versions, DynamoDB PITR, logs/alarms
and hosting can cost money without scans. Use the future authorized teardown in
DEPLOYMENT.md; cleanup/protection changes are not incidental troubleshooting actions.
