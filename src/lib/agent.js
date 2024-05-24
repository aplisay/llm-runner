import { createAgent, listModels, listVoices, updateAgent, deleteAgent, setBackend } from "../api/interface.js";
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

  function onMessage(message) {
    console.log('message', message);
    message.call && (calls[message.call_id] = callHandler(message));
    calls[message.call_id] && calls[message.call_id](message);
    message.hangup && (message[message.call_id] = null);
  }

  function callHandler(message) {
    console.log(`new call`, message);
    let state = { ...message };
  }

  try {


    let agent = await createAgent({
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