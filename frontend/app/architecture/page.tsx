import Link from "next/link";

export default function Architecture() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111] font-sans antialiased">
      
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-[800px] mx-auto px-6 h-14 flex items-center justify-between text-sm">
          <div className="font-semibold tracking-tight">Audio Notes</div>
          <nav className="flex gap-6 text-neutral-500">
            <Link href="/" className="hover:text-neutral-900 transition-colors">
              Upload
            </Link>
            <div className="text-neutral-900">Architecture</div>
          </nav>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-12 md:py-20">
        
        <div className="mb-12">
          <h1 className="text-2xl font-medium tracking-tight mb-4">System Architecture</h1>
          <p className="text-neutral-500 text-sm leading-relaxed">
            How an audio file moves through the system from upload to summary generation.
          </p>
        </div>

        {/* Minimal Diagram */}
        <div className="border border-neutral-200 bg-white p-8 mb-16 text-sm font-mono flex flex-col items-center">
          <div className="text-center">
            <div className="border border-neutral-300 px-4 py-2">User (Next.js)</div>
            <div className="py-2 text-neutral-400">↓</div>
            <div className="border border-neutral-300 px-4 py-2 bg-neutral-50">FastAPI</div>
            <div className="py-2 text-neutral-400">↓</div>
            <div className="flex gap-4 justify-center">
              <div className="border border-neutral-300 px-4 py-2 text-xs">Local Storage</div>
              <div className="border border-neutral-300 px-4 py-2 text-xs">PostgreSQL</div>
            </div>
            <div className="py-2 text-neutral-400">↓</div>
            <div className="border border-neutral-300 px-4 py-2 bg-neutral-900 text-white">Celery Worker</div>
            <div className="py-2 text-neutral-400">↓</div>
            <div className="flex gap-4 justify-center">
              <div className="border border-neutral-300 px-4 py-2 text-xs">Gnani ASR</div>
              <div className="py-2 text-neutral-400">→</div>
              <div className="border border-neutral-300 px-4 py-2 text-xs">Gemini LLM</div>
            </div>
            <div className="py-2 text-neutral-400">↓</div>
            <div className="border border-neutral-300 px-4 py-2">Next.js UI updates via polling</div>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="space-y-12">
          
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4">1. Upload & Initialization</h2>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              The Next.js frontend submits the audio file to the FastAPI backend. The backend immediately saves the file to local storage (or an S3 bucket in a larger deployment) and creates a tracking record in the Neon PostgreSQL database with an <code>UPLOADED</code> status.
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Crucially, the HTTP request returns the Job ID immediately. This prevents the user's browser from timing out on large files.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4">2. Background Processing</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Audio transcription and LLM inference take longer than a standard HTTP lifecycle allows. The backend delegates processing to a Celery worker via an Upstash Redis message broker. The worker picks up the job ID, retrieves the file, and begins processing.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4">3. External APIs</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              The Celery worker passes the audio to the <strong>Gnani ASR API</strong>. Once the raw transcript is returned, the database status updates to <code>SUMMARIZING</code>, and the text is passed to <strong>Gemini 3.5 Flash</strong> to extract key points.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4">4. UI Synchronization</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              The frontend uses a simple interval timer to poll the <code>/api/jobs/{"{id}"}</code> endpoint every 3 seconds. The UI steps through the timeline (Upload → Transcription → Summary) dynamically based on the database state.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4">5. Handling Failures</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              If an external API fails (e.g., Gnani rejects an unsupported codec, or Gemini times out), the Celery worker intercepts the exception, updates the database status to <code>FAILED</code>, and writes a clean error message. The frontend polls this failure state and presents it to the user without exposing stack traces.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-4">6. Future Improvements</h2>
            <ul className="text-sm text-neutral-600 leading-relaxed list-disc pl-5 space-y-2">
              <li><strong>Object Storage:</strong> Migrate from local disk storage to S3, allowing the API and Workers to scale horizontally on separate servers.</li>
              <li><strong>WebSockets / SSE:</strong> Replace HTTP polling with Server-Sent Events for more efficient UI updates.</li>
              <li><strong>Queue Prioritization:</strong> Implement separate Celery queues (e.g., short audio vs long audio) to prevent large files from blocking smaller requests.</li>
            </ul>
          </section>

        </div>
      </main>
    </div>
  );
}