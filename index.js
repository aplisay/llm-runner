#!/usr/bin/env node
import 'dotenv/config';
import { agent } from "./src/lib/agent.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';


yargs(hideBin(process.argv))
  .command('agent', 'Start an agent', {
    filename: {
        alias: 'f',
        type:'string',
        default: 'agent.json',
        describe: 'Agent JSON file',
      },
      numbers: {
        alias: 'n',
        type: 'array',
        default: [],
        describe: 'List of phone numbers to request',
      },
      model: {
        alias:'m',
        type:'string',
        default: 'openai:gpt-4o',
        describe: 'Model to use',
      },
      server: {
        alias: 'h',
        type:'string',
        default: 'http://localhost:5000',
        describe: 'Base URL for llm-agent server',
      },
      debug: {
        alias: 'd',
        type: 'boolean',
        default: false,
        describe: 'Debug mode',
      },
      verbose: {
        alias: 'v',
        type: 'boolean',
        default: false,
        describe: 'Verbose mode',
      }
   
  }, (argv) => {
    let parameters = argv
    console.info(argv, 'agent');
    agent(parameters);
  })
  .demandCommand(1)
  .parse();