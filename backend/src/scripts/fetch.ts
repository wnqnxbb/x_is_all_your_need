import { fetchService } from '../services/fetch.service.js';

console.log('🚀 Starting manual fetch...');
await fetchService.fetchAllProjects();
console.log('✅ Manual fetch completed!');
