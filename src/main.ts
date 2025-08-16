import * as core from '@actions/core';
import { DIContainer } from './infrastructure/config/DIContainer';
import { GitHubActionController } from './adapters/controllers/GitHubActionController';

async function run(): Promise<void> {
  try {
    // Initialize dependency container
    const container = new DIContainer();
    
    // Get controller
    const controller = container.get<GitHubActionController>('actionController');
    
    // Run the action
    await controller.run();
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

// Run the action
run();