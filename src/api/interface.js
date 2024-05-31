import WebSocket from 'ws';
import Axios from 'axios';


let api, backend;
let axios = Axios.create();

setBackend(process.env.BACKEND_SERVER || 'http://localhost:4444/');

export function setBackend(url) {
  backend = new URL(url);
  api = Axios.create({
    baseURL: `${backend.origin}/api`,
    method: "get"
  });

}

async function functionHandler(message, functions, onMessage) {

  const replaceParameters = (str, fcn) => {
    let result = str;
    Object.keys(fcn.input).forEach(key => {
      result = result.replace(`{${key}}`, `${fcn.input[key]}`);
    });
    return result;
  };

  if (message.function_calls) {
    let function_results = await Promise.all(
      message.function_calls?.map(async fn => {
        let f = functions.find(entry => entry.name === fn.name);
        let result, error;
        if (f && f.implementation === 'stub') {
          result = replaceParameters(f.result, fn);
          return { ...fn, result };
        }
        else if (f && f.implementation === 'rest') {
          try {
            let url = new URL(replaceParameters(f.url, fn));
            onMessage && onMessage({
              rest_callout: {
                url: url.toString(),
                method: f.method?.toUpperCase(),
                body: f.method === 'post' ? fn.input : ''
              },
              call_id: message.call_id
            });
            let response = await axios({
              url,
              method: f.method,
              data: f.method === 'post' ? JSON.stringify(fn.input) : undefined,
            });
            result = response.data;
          } catch (e) {
            result = e.message;
            console.error(e, 'API Error');
            error = JSON.stringify(e);
          }
          return { ...fn, result: JSON.stringify(result, null, 2), error };
        }
        if (f.implementation === 'rest')
          return { ...fn, result };
      }));
    return { function_results, call_id: message.call_id };
  }
};

const transformFunctions = (functions) => functions?.map?.(({ name, description, parameters }) => ({
  name,
  description,
  input_schema: {
    type: "object",
    properties:
      parameters.reduce((o, p) => ({
        ...o, [p.name]: {
          type: p.type,
          description: p.description
        }
      }), {}),
  }
}));


export async function createAgent({ modelName, prompt, options, functions, onClose, onMessage }) {
  let { data } = await api.post('/agents', { modelName, prompt, options, functions: transformFunctions(functions) });
  if (data?.socket) {
    let wsPath = `${backend.protocol === 'https:' ? 'wss:' : 'ws:'}//${backend.host}${data?.socket}`;
    let ws = new WebSocket(wsPath);
    ws.addEventListener('message', async (message) => {
      try {
        data = JSON.parse(message.data);
        onMessage && onMessage(data);
        if (data.function_calls) {
          let response = await functionHandler(data, functions, onMessage);
          response?.call_id && ws.send(JSON.stringify(response));
          onMessage && onMessage(response);
        }
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

export async function updateAgent({ id, prompt, options, functions }) {
  let { data } = await api.put(`/agents/${id}`, { prompt, options, functions: transformFunctions(functions) });
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