import { createAgent, listModels, listVoices, updateAgent, deleteAgent, setBackend } from "../api/interface.js";
import { Storage } from "./storage.js";
import { readFile } from 'fs/promises';


export async function agent({ filename, numbers, model, server }) {

  try {
    setBackend(server);
    let models = await listModels();
    let voices = await listVoices();
    let rawData = await readFile(filename);
    let data = JSON.parse(rawData);
    let { prompt, agent, language, voice, functions } = data;
    console.log({ models, voices, data, functions });
    if (!prompt) {
      throw (new Error("Prompt is required"));
    }

    startAgent({ prompt: prompt.value, model: model || agent.model, language, voice, functions });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export async function startAgent({ prompt, model='gpt-4o', language, voice, functions }) {

  let onClose, onError;
  let agent;
  let terminate = new Promise((resolve, reject) => {
    onClose = resolve;
    onError = reject;
  });

  function getOptions(language, voice) { 
  let [provider, voiceName] = voice?.split(':') || [];
  return{
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
    console.log('message', message);
    message.call && (calls[message.call_id] = Storage.getConversation({ id: message.call_id, startDate: new Date(), caller: message.call, callee: agent?.number })) 
    calls[message.call_id] && calls[message.call_id].add(message);
    message.hangup && await calls[message.call_id].release();
    message[message.call_id] = null;
  }

  try {


    agent = await createAgent({
      modelName: model,
      prompt,
      options: getOptions(language, voice),
      functions,
      onClose: (reason) => {
        console.log({ close: { reason } });
        onClose && onClose(reason);
      },
      onMessage
    });
    console.log(`New agent created on number: ${agent.number}`);
  }
  catch (err) {
    console.error({ err });
    onError(err.message);
  }

  return terminate;
}