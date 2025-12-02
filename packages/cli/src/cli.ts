#!/usr/bin/env node
import { Command } from 'commander';
import { auditCommand } from './commands/audit';

const program = new Command();

program
  .name('cg-a11y')
  .description('Creative Growth Accessibility Audit Tool')
  .version('2.0.0');

program
  .command('audit')
  .description('Run accessibility audit on a website')
  .requiredOption('-u, --url <url>', 'Website URL to audit')
  .option('-c, --config <path>', 'Path to config file', 'config.yaml')
  .option('-o, --output <path>', 'Output JSON file path', 'audit-results.json')
  .option('--skip-db', 'Skip saving results to database')
  .action(auditCommand);

program.parse();
