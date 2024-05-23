import WebSocket from 'ws';

import { api } from './client.js';

const backend = new URL(process.env.BACKEND_SERVER);

export async function createAgent({ modelName, prompt, options, onClose, onMessage }) {
  console.log({ modelName, prompt, options }, 'createAgent');
  let { data } = await api.post('/agents', { modelName, prompt, options });
  if (data?.socket) {
    let wsPath = `${backend.protocol === 'https:' ? 'wss:' : 'ws:'}//${backend.host}${data?.socket}`;
    let ws = new WebSocket(wsPath);
    ws.addEventListener('message', (message) => {
      try {
        data = JSON.parse(message.data);
        onMessage && onMessage(data);
      }
      catch (e) {
      }
    });
    ws.addEventListener('error', (err) => {
    });
    ws.addEventListener('close', (err) => {
      onClose && onClose(err.message);
    });
    data.ws = ws;

  }
  return data;
}

export async function listModels() {
  let { data } = await api.get('/models');
  return Object.entries(data);
}

export async function updateAgent({ id, prompt, options }) {
  let { data } = await api.put(`/agents/${id}`, { prompt, options });
  return data;
}

export async function deleteAgent({ id }) {
  try {
    let { data } = await api.delete(`/agents/${id}`);
    return data;
  }
  catch (e) {
    // we may be trying to delete an agent because of a failed network, don't care too much
  }
}

export async function listVoices() {
  let { data } = await api.get('/voices');
  return data;
}
