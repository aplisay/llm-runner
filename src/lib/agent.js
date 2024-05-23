import { createAgent, listModels, listVoices, updateAgent, deleteAgent } from "../api/interface.js";
import { readFile } from 'fs/promises';

export async function agent({filename, numbers, model, server}) {

  let onClose, onError;
  let terminate = new Promise((resolve, reject) => {
    onClose = resolve;
    onError = reject;
  });
  const defaultOptions = {
    tts: {
      language: 'en-GB',
      voice: 'en-GB-Wavenet-A'
    },
    stt: {
      language: 'en-GB'
    }

  };

  let calls = {};

  function onMessage(message) {
    console.log('message', message)
    message.call && (calls[message.call_id] = callHandler(message));
    calls[message.call_id] && calls[message.call_id](message);
    message.hangup && (message[message.call_id] = null);
  }

  function callHandler(message) {
    console.log(`new call`, message);
    let state = { ...message }
    return (newMessage) => {
      console.log(`update`, { state, newMessage });
    }   
  }

  try {


    let agent = await createAgent({
      modelName: model
      prompts,
      options,
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




async function getPrompts(path) {
  let file = await readFile(
    new URL(path, import.meta.url)
  );

  return JSON.parse(file);
}