
import 'dotenv/config';
import Axios from 'axios';

if (!process.env.BACKEND_SERVER) {
  throw new Error(
    "No backend server, set BACKEND_SERVER in server environment ;"
  );
}

const api = Axios.create({
  baseURL: `${process.env.BACKEND_SERVER}/api`,
  method: "get"
});


export { api};
