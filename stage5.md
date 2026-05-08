# Stage 5

## Reliable Notify-All Implementation

### Problem with naive pseudocode

The provided implementation:

```python
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)  # calls Email API
    save_to_db(student_id, message)  # DB insert
    push_to_app(student_id, message)
```

Shortcomings:
- synchronous loop is too slow for 50,000 students
- a single failure stops the process
- email send and DB save are tightly coupled
- there is no retry or failure handling
- the caller waits for everything to complete

### Reliable redesign

Use asynchronous jobs and decoupled workers:

1. Create a batch job for the notification campaign.
2. Persist the campaign metadata first.
3. Enqueue separate jobs for email send and app push.
4. Use retries and failure handling on each worker.

### Recommended architecture

- API receives `notify_all` request
- persistence layer saves the notification campaign
- enqueue messages into a queue service
- worker processes each student independently
- email and app push are separate flows

### Revised pseudocode

```python
function notify_all(student_ids, message):
  job_id = create_notification_campaign(message)
  for student_id in student_ids:
    enqueue('notification-job', {
      'jobId': job_id,
      'studentId': student_id,
      'message': message
    })

worker process_notification_job(job):
  notification = save_notification_record(job.studentId, job.message, job.jobId)
  enqueue('email-job', { 'studentId': job.studentId, 'notificationId': notification.id, 'message': job.message })
  enqueue('push-job', { 'studentId': job.studentId, 'notificationId': notification.id, 'message': job.message })
```

### Why this is better

- decouples responsibility into smaller units
- supports retries for failed email or push
- processes jobs in parallel
- avoids blocking the request path
- improves reliability for 50,000 students

### Handling partial failures

- persist notification records first to avoid duplicate delivery
- if email fails, retry using exponential backoff
- if push fails, log and retry separately
- track status by job and student

### Notes on DB and email order

Saving to DB and sending email should not happen in a single blocking transaction for all students.
Instead, save a notification record and then enqueue delivery.
This keeps the system resilient and ensures retries can be applied independently.
