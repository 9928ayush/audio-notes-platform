import Link from "next/link";

export default function Architecture() {
  return (
    <main className="max-w-3xl mx-auto p-10 bg-white min-h-screen">
      <Link href="/" className="text-blue-600 hover:underline font-medium">&larr; Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mt-6 mb-4">System Architecture</h1>
      
      <section className="space-y-6 text-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2 mb-3">1. System Flow</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Upload:</strong> The Next.js client posts the audio file to the FastAPI backend.</li>
            <li><strong>Storage & Dispatch:</strong> FastAPI uploads the file to an S3 bucket, creates a PostgreSQL tracking record, dispatches a background task to Celery, and immediately returns the Job ID to prevent HTTP timeouts on long files.</li>
            <li><strong>Processing:</strong> A Celery worker fetches the job. It calls the Gnani ASR API, updates the DB to TRANSCRIBING, calls the OpenAI API for summarization, updates the DB to SUMMARIZING, and finally marks the job as COMPLETED.</li>
            <li><strong>Client Updates:</strong> The frontend polls the <code className="bg-gray-100 px-1 py-0.5 rounded">/api/jobs/{"{id}"}</code> endpoint every 3 seconds to update the UI dynamically.</li>          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2 mb-3">2. Design Decisions</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>PostgreSQL over MongoDB:</strong> Used for strict schema enforcement on the job state machine.</li>
            <li><strong>Redis + Celery:</strong> Crucial for workflow orchestration. Long audio transcription cannot happen synchronously without risking gateway timeouts (e.g., 504 errors).</li>
            <li><strong>S3 Storage:</strong> Cloud providers (Render, Heroku) have ephemeral filesystems. Saving locally would cause files to be lost between web and worker processes.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-2 mb-3">3. Failure Handling</h2>
          <p>
            The background worker wraps third-party API calls in <code>try/except</code> blocks. If Gnani or OpenAI times out, the Celery task catches the exception, updates the database status to <code>FAILED</code>, and stores the traceback in <code>error_message</code>. The frontend gracefully surfaces this error instead of hanging infinitely.
          </p>
        </div>
      </section>
    </main>
  );
}