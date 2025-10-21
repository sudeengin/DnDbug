/**
 * Logger Demo - Shows all logging features
 * Run with: node test-logger-demo.js
 */

import logger from './api/lib/logger.js';

// Demo function to show all logger features
async function demonstrateLogging() {
  console.log('\n' + '='.repeat(80));
  console.log('LOGGER SYSTEM DEMONSTRATION');
  console.log('='.repeat(80) + '\n');

  // 1. Different Components
  console.log('\n--- DIFFERENT COMPONENTS ---\n');
  logger.background.info('Background logger message');
  logger.character.info('Character logger message');
  logger.macroChain.info('Macro chain logger message');
  logger.scene.info('Scene logger message');
  logger.context.info('Context logger message');
  logger.storage.info('Storage logger message');
  logger.api.info('API logger message');
  logger.ai.info('AI logger message');
  logger.lock.info('Lock logger message');

  // 2. Different Log Levels
  console.log('\n--- DIFFERENT LOG LEVELS ---\n');
  const log = logger.context;
  log.debug('Debug message - detailed technical info');
  log.info('Info message - general flow information');
  log.warn('Warning message - something unexpected');
  log.error('Error message - something failed');
  log.success('Success message - positive outcome');

  // 3. Structured Data Logging
  console.log('\n--- STRUCTURED DATA ---\n');
  log.info('User action', {
    userId: 123,
    action: 'create_scene',
    timestamp: new Date().toISOString(),
    metadata: {
      sceneType: 'combat',
      difficulty: 'medium'
    }
  });

  // 4. Child Loggers with Context
  console.log('\n--- CHILD LOGGERS ---\n');
  const sessionLog = log.child('Session:abc123');
  sessionLog.info('Processing request');
  sessionLog.success('Request completed');

  const sceneLog = logger.scene.child({ sceneId: 'scene-456', type: 'exploration' });
  sceneLog.debug('Generating scene content');
  sceneLog.info('Scene saved to database');

  // 5. Custom Emoji Messages
  console.log('\n--- CUSTOM EMOJIS ---\n');
  log.custom('🎯', 'Target acquired');
  log.custom('🚀', 'Launching process');
  log.custom('💡', 'Insight discovered');

  // 6. Separators
  console.log('\n--- SEPARATORS ---\n');
  logger.background.separator();
  logger.character.separator('═', 60);
  logger.scene.separator('─', 40);

  // 7. Section Headers
  console.log('\n--- SECTION HEADERS ---\n');
  logger.macroChain.section('MACRO CHAIN PROCESSING');
  logger.scene.section('SCENE GENERATION WORKFLOW');

  // 8. Grouped Logs
  console.log('\n--- GROUPED OPERATIONS ---\n');
  logger.group('scene', 'Scene Generation Process', (log) => {
    log.info('Step 1: Loading context');
    log.info('Step 2: Building prompt');
    log.info('Step 3: Calling AI model');
    log.success('Scene generated successfully');
  });

  logger.group('context', 'Context Memory Update', (log) => {
    log.debug('Current version: 5');
    log.info('Appending new block: background');
    log.info('Incrementing version to: 6');
    log.success('Context saved');
  });

  // 9. Simulated Workflow
  console.log('\n--- SIMULATED WORKFLOW ---\n');
  await simulateWorkflow();

  // 10. Error Handling Demo
  console.log('\n--- ERROR HANDLING ---\n');
  await simulateErrorScenario();

  console.log('\n' + '='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

/**
 * Simulate a complete workflow with proper logging
 */
async function simulateWorkflow() {
  const log = logger.api;
  
  log.section('USER REQUEST PROCESSING');
  
  const requestLog = log.child('RequestID:req-789');
  
  requestLog.info('Incoming request', {
    endpoint: '/api/scene/generate',
    method: 'POST'
  });
  
  // Validate input
  logger.validation.info('Validating request payload');
  logger.validation.success('Validation passed');
  
  // Load context
  logger.context.info('Loading session context');
  await simulateDelay(100);
  logger.context.success('Context loaded', { version: 7 });
  
  // Check lock
  logger.lock.info('Checking scene lock status');
  logger.lock.debug('No active lock found');
  logger.lock.success('Lock acquired');
  
  // Generate content
  logger.ai.info('Preparing AI prompt');
  logger.prompt.debug('Building prompt from context');
  logger.prompt.info('Prompt ready', { tokens: 1250 });
  
  logger.ai.info('Calling AI model');
  await simulateDelay(200);
  logger.ai.success('AI response received', { tokens: 850 });
  
  // Save results
  logger.storage.info('Saving scene to storage');
  await simulateDelay(50);
  logger.storage.success('Scene saved', { sceneId: 'scene-new-123' });
  
  // Update context
  logger.context.info('Updating context memory');
  logger.context.success('Context updated', { newVersion: 8 });
  
  // Release lock
  logger.lock.info('Releasing scene lock');
  logger.lock.success('Lock released');
  
  requestLog.success('Request completed successfully');
}

/**
 * Simulate error scenarios
 */
async function simulateErrorScenario() {
  const log = logger.scene;
  
  log.info('Attempting risky operation');
  
  try {
    log.debug('Processing step 1');
    await simulateDelay(50);
    
    log.debug('Processing step 2');
    await simulateDelay(50);
    
    // Simulate error
    throw new Error('Network timeout');
    
  } catch (error) {
    log.error('Operation failed', {
      error: error.message,
      stack: error.stack?.split('\n')[0]
    });
    
    logger.error.error('Error details:', {
      component: 'scene',
      operation: 'generate',
      timestamp: new Date().toISOString(),
      error: error.message
    });
    
    log.warn('Attempting retry...');
    await simulateDelay(100);
    log.success('Retry successful');
  }
}

/**
 * Helper to simulate async delays
 */
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demonstration
demonstrateLogging().catch(error => {
  logger.error.error('Demo failed:', error);
  process.exit(1);
});

