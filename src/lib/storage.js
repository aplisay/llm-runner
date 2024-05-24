import { writeFile } from 'fs/promises';

const conversations = new Map();

/**
 *
 *
 * @export
 * @class Storage
 */
export class Storage {
/**
 *
 *
 * @static
 * @type {Map<string, Storage>}
 * @memberof Storage
 */
  static conversations = new Map();

  /**
   * Gets an existing conversation object from the ID. If it doesn't exist, it creates a new one and returns it.
   *
   * @static
   * @param {string} id
   * @param {Date} startDate
   * @param {string} caller
   * @param {string} callee
   * @returns {Storage} an existing or new storage object
   * @memberof Storage
   */

  static getConversation({ id, startDate, caller, callee }) {
    return conversations.has(id) ? conversations.get(id) : new Storage({ id, startDate, caller, callee });
  }

  /**
   * Creates a new conversation object.
   *
   * @constructor
   * @param {string} id
   * @param {Date} startDate
   * @param {string} caller
   * @param {string} callee
   * @memberof Storage
   */
  constructor({ id, startDate, caller, callee }) {
    console.log({ arguments }, 'new storage object');
    Object.assign(this, { id, startDate: startDate || new Date(), caller, callee });
    this._transcript = [{
      starts: this.startDate,
      caller: this.caller,
      callee: this.callee
    }];
    conversations.set(id, this);
  }
/**
 * Add an event to the storage object
 *
 * @memberof Storage
 */

  add(event) {
    this._transcript.push(event);
  }

  get transcript() {
    return this._transcript;
  }

  set transcript(transcript) {
    this._transcript = transcript;
  }

  async release({ endDate } = {}) {
    this.endDate = endDate || new Date();
    let filename = `${this.id}-${this.caller}-${this.startDate.valueOf()}.json`;
    let struct = {
      ...this,
      _transcript: undefined,
      transcript: this._transcript
    }
    console.log({ struct }, 'saving');
    await writeFile(filename, JSON.stringify(struct, null, 2));
    conversations.delete(this.id);

  }
}