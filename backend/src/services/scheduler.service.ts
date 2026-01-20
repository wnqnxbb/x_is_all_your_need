import cron from 'node-cron';
import { fetchService } from './fetch.service.js';

export class SchedulerService {
  constructor() {
    this.scheduleFetch();
  }

  private scheduleFetch(): void {
    // 每天早上 3 点执行
    cron.schedule('0 3 * * *', async () => {
      console.log('🕒 Scheduled fetch started at', new Date().toISOString());
      await fetchService.fetchAllProjects();
      console.log('🕒 Scheduled fetch completed at', new Date().toISOString());
    });

    console.log('✅ Scheduler initialized: fetching tweets every day at 3:00 AM');
  }
}

export const schedulerService = new SchedulerService();
