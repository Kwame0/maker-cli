/**
 * Queue-based Rate Limiter for API requests
 * Ensures we stay within the specified requests-per-minute limit
 * while allowing concurrent batch processing
 */
export class RateLimiter {
    /**
     * @param {number} maxRpm - Maximum allowed requests per minute
     */
    constructor(maxRpm) {
        this.maxRpm = maxRpm;
        this.queue = [];
        this.processing = false;
        this.requestTimestamps = [];
    }

    /**
     * Throttles the execution of a function to ensure RPM limit is not exceeded.
     * @param {Function} fn - The async function to execute (e.g., API call).
     * @returns {Promise<any>} - The result of the function.
     */
    async throttle(fn) {
        return new Promise((resolve, reject) => {
            // Push the task to the queue
            this.queue.push({ fn, resolve, reject });
            // Try to process the queue
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();

            // 1. Clean up timestamps older than 1 minute
            this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);

            // 2. Check if we have capacity
            if (this.requestTimestamps.length < this.maxRpm) {
                // GO: We have capacity
                const task = this.queue.shift();
                this.requestTimestamps.push(Date.now());

                // Run the task (don't await it here, or we block concurrency)
                task.fn()
                    .then(task.resolve)
                    .catch(task.reject);
            } else {
                // STOP: We hit the limit. Calculate wait time.
                // Find the oldest timestamp in the window to know when it expires
                const oldestCall = this.requestTimestamps[0];
                const timeToWait = 60000 - (now - oldestCall) + 100; // +100ms buffer

                // Wait, then try again
                await new Promise(resolve => setTimeout(resolve, timeToWait));
            }
        }

        this.processing = false;
    }

    /**
     * Gets the number of remaining requests in the current minute
     * @returns {number} - Number of requests available
     */
    getAvailableRequests() {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
        return Math.max(0, this.maxRpm - this.requestTimestamps.length);
    }

    /**
     * Checks if we can make N requests without waiting
     * @param {number} count - Number of requests to check
     * @returns {boolean} - True if we can make that many requests
     */
    canMakeRequests(count) {
        return this.getAvailableRequests() >= count;
    }
}
