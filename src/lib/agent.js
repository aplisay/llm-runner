import { createAgent, listModels, listVoices, updateAgent, deleteAgent, setBackend } from "../api/interface.js";
import logger from './logger.js';

import { Storage } from "./storage.js";
import { readFile } from 'fs/promises';


export async function agent({ filename, numbers, model, server }) {


    try {
      setBackend(server);
      let rawData = await readFile(filename);
      let data = JSON.parse(rawData);
      let { prompt, agent, language, voice, functions } = data;
      logger.info({ filename }, 'creating agent from file');
      if (!prompt) {
        throw (new Error("Prompt is required"));
      }
      while (1) {
        try {
          await startAgent({ prompt: prompt.value, model: model || agent.model, language, voice, functions });
          logger.error({}, 'agent terminated');
        }
        catch (e) {
          logger.error(e, 'StartAgent Error');
        }
      }

    } catch (error) {
      logger.fatal(error, "can't start agent");
      process.exit(1);
    }
  }

  export async function startAgent({ prompt, model = 'gpt-4o', language, voice, functions }) {

    let onClose, onError;
    let agent;
    let terminate = new Promise((resolve, reject) => {
      onClose = resolve;
      onError = reject;
    });

    function getOptions(language, voice) {
      let [provider, voiceName] = voice?.split(':') || [];
      return {
        tts: {
          voice: voiceName || voice,
          vendor: provider || 'google',
        },
        stt: {
          language
        }
      };
    }
    let calls = {};

    async function onMessage(message) {
      logger.debug({ message, call_id: message.call_id }, 'message');
      if (message.call) {
        calls[message.call_id] = Storage.getConversation({ id: message.call_id, startDate: new Date(), caller: message.call, callee: agent?.number });
        logger.info({ number: message.call, call_id: message.call_id }, 'new call');
      }
      let interesting = ['call', 'hangup', 'function_calls', 'function_results', 'user', 'agent', 'rest_callout'];
      let transaction = Object.fromEntries(Object.entries(message).filter(([key, value]) => interesting.includes(key)));
      calls[message.call_id] && calls[message.call_id].add(transaction);
      if (message.hangup) {
        await calls[message.call_id].release();
        logger.info({ call_id: message.call_id }, 'hangup call');
        message[message.call_id] = null;
      }

    }

    try {
      agent = await createAgent({
        modelName: model,
        prompt,
        options: getOptions(language, voice),
        functions,
        onClose: (reason) => {
          logger.info({ agent }, `Agent closed with reason: ${reason}`);
          onClose && onClose(reason);
        },
        onMessage
      });
      let { number, id, socket } = agent || {};
      if (!agent) {
        logger.error({agent}, 'agent failed')
        throw (new Error('cant start agent'));
      }
      logger.info({ number, id, socket }, `New agent created on number: ${agent.number}`);
    }
    catch (err) {
      logger.error({ err }, 'ERROR');
      setTimeout(() => onError(err.message), 5000);
    }

    return terminate;
  }