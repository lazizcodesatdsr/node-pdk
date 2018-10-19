'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getOu = getOu;
exports.getPanelToken = getPanelToken;
exports.getPanel = getPanel;
async function getOu(session, id = 'mine') {
  return await session(`ous/${id}`);
}

async function getPanelToken(session, id) {
  // This must conform to the token_set identity
  // see its use in session.js

  // Returns an async function that when called will analyze its current credentials and
  // optimistically update them as needed.
  // Must return an object like or throw `{ id_token: /*bearer token for api calls*/ }`
  // The function must also also have a `refresh()` member function that runs the refresh logic on command
  // often in response to an authentication failure.
  //

  let id_token;
  const token_set = async () => {
    // If we don't have a token, lets get one
    if (!id_token) {
      await token_set.refresh();
    }

    // TODO: Check the expiration of the token and update before it expires

    return {
      id_token
    };
  };

  token_set.refresh = async () => {
    id_token = (await session(`panels/${id}/token`, { method: 'POST' })).token;
  };

  return token_set;
}

async function getPanel(session, id) {
  return await session(`panels/${id}`);
}

exports.default = {
  getOu,
  getPanelToken,
  getPanel
};