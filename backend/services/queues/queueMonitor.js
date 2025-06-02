class QueueMonitor {
  constructor(queue) {
    this.queue = queue;
    this.metrics = {
      processed: 0,
      failed: 0,
      active: 0,
      waiting: 0,
      delayed: 0,
      averageProcessingTime: 0,
      throughput: []
    };

    this.startMonitoring();
  }

  startMonitoring() {
    // Update metrics every 10 seconds
    setInterval(() => this.updateMetrics(), 10000);

    // Track completed jobs
    this.queue.on('completed', (job, result) => {
      this.metrics.processed++;
      if (job.processedOn && job.finishedOn) {
        this.updateProcessingTime(job.processedOn, job.finishedOn);
      }
    });

    // Track failed jobs
    this.queue.on('failed', (job, err) => {
      this.metrics.failed++;
    });
  }

  async updateMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    this.metrics = {
      ...this.metrics,
      waiting,
      active,
      completed,
      failed,
      delayed
    };

    // Calculate throughput (jobs per minute)
    const currentTime = Date.now();
    this.metrics.throughput.push({
      time: currentTime,
      count: this.metrics.processed
    });

    // Keep only last 10 minutes of throughput data
    this.metrics.throughput = this.metrics.throughput.filter(
      t => currentTime - t.time < 600000
    );
  }

  updateProcessingTime(startTime, endTime) {
    const duration = endTime - startTime;
    const count = this.metrics.processed;
    
    // Calculate running average
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (count - 1) + duration) / count;
  }

  async getQueueHealth() {
    await this.updateMetrics();
    
    const health = {
      status: 'healthy',
      metrics: this.metrics,
      warnings: [],
      timestamp: new Date().toISOString()
    };

    // Check for issues
    if (this.metrics.failed > this.metrics.processed * 0.1) {
      health.warnings.push('High failure rate detected');
      health.status = 'warning';
    }

    if (this.metrics.waiting > 100) {
      health.warnings.push('Large queue backlog');
      health.status = 'warning';
    }

    if (this.metrics.averageProcessingTime > 300000) { // 5 minutes
      health.warnings.push('Slow processing times');
      health.status = 'warning';
    }

    return health;
  }

  async getJobStats(timeRange = 3600000) { // Default 1 hour
    const now = Date.now();
    const jobs = await this.queue.getJobs(['completed', 'failed'], 0, -1);
    
    const recentJobs = jobs.filter(job => 
      job.finishedOn && (now - job.finishedOn) < timeRange
    );

    const stats = {
      total: recentJobs.length,
      successful: recentJobs.filter(j => j.returnvalue).length,
      failed: recentJobs.filter(j => j.failedReason).length,
      byAgentType: {},
      byUser: {},
      averageTokens: 0,
      totalCost: 0
    };

    // Aggregate by agent type and user
    for (const job of recentJobs) {
      const { agentType, userId } = job.data;
      const usage = job.returnvalue?.usage || {};

      stats.byAgentType[agentType] = (stats.byAgentType[agentType] || 0) + 1;
      stats.byUser[userId] = (stats.byUser[userId] || 0) + 1;
      
      if (usage.tokensUsed) {
        stats.averageTokens += usage.tokensUsed;
        stats.totalCost += usage.cost || 0;
      }
    }

    stats.averageTokens = stats.total > 0 ? Math.round(stats.averageTokens / stats.total) : 0;
    stats.totalCost = Math.round(stats.totalCost * 100) / 100; // Round to cents

    return stats;
  }

  async getDashboardData() {
    const [health, hourlyStats, dailyStats] = await Promise.all([
      this.getQueueHealth(),
      this.getJobStats(3600000),  // Last hour
      this.getJobStats(86400000)  // Last 24 hours
    ]);

    return {
      health,
      stats: {
        hourly: hourlyStats,
        daily: dailyStats
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = QueueMonitor;