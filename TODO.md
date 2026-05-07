# TODO - Inter-hospital record sharing enhancements

## Step 1: Confirm current implementation

- Verify existing inter-hospital request/approval endpoints and UI behavior.
- Identify missing pieces for “all patients across all hospitals” and dashboard navigation.

## Step 2: Backend - Network-wide patient listing

- Add controller endpoint to list all patient users (network-wide) for inter-hospital request page.
- Add corresponding route under `/api/inter-hospital`.

## Step 3: Backend - Record access correctness after approval

- Ensure `checkRecordAccess()` authorizes the logged-in hospital when there is an approved `AccessRequest`.
- Adjust logic if it incorrectly uses `homeHospital`/naming or expiry fields.

## Step 4: Frontend - Update InterHospitalRecordRequest

- Use new endpoint to allow selecting patients network-wide (instead of requiring manual patientId entry only).

## Step 5: Frontend - HospitalDashboard navigation

- Add button/link to navigate to `/inter-hospital`.

## Step 6: Testing

- Run quick backend/test scripts or basic API calls.
- Manually verify request->approve->view records flow.
