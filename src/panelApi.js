import url from 'url';
import io from 'socket.io-client';
import opener from 'opener';
import {getPanelToken, getPanel} from './authApi';
import {makesession as makeauthsession} from './session';
import {authenticate, refreshTokenSet} from './authenticator';

async function makesession(authsession, {id, uri}) {
  const token = await getPanelToken(authsession, id);
  const session = makeauthsession(
    token,
    url.resolve(uri, 'api/')
  );

  session.connectStream = function () {
    const stream = io(uri, {query: `token=${token}`});
    return new Promise((resolve, reject) => {
      stream.once('connect', () => resolve(stream));
      stream.once('error', reject);
    });
  };

  return session;
}

/**
 * Provides access to the panel api by the panel id, including refresh id tokens functionality
 * @param client_id client application identifier
 * @param client_secret client application secret
 * @param panel_id identifier of the panel
 * @param issuer openID connect provider url
 * @returns {function(*=, *=)} panel session, function with two parameters: relative path to the resource
 * (e.g. 'persons' or 'groups/{id}') and options object that can include for example 'method', 'body' or 'query' properties
 */
export default async function (client_id, client_secret, panel_id, issuer = 'https://accounts.pdk.io') {
  let tokenset = await authenticate(client_id, client_secret, opener, issuer);
  if (!tokenset || !tokenset.id_token) {
    throw new Error('Cannot get id_token from OpenID Connect provider');
  }

  let authsession = makeauthsession(tokenset.id_token, url.resolve(issuer, 'api/'));

  let panel = await getPanel(authsession, panel_id);

  const options = {id: panel.id, uri: panel.uri};
  let panelSession = await makesession(authsession, options);

  return async(callurl, callopts = {}) => {
    try {
      return await panelSession(callurl, callopts);
    } catch (err) {
      if (err && err.statusCode === 401) {
        console.log('Panel token is expired, refresh all tokens');
        try {
          if (!tokenset.refresh_token) {
            //if client does not support refresh tokens (implicit authentication flow) we will get token set from /auth
            throw new Error();
          }
          tokenset = await refreshTokenSet(client_id, client_secret, tokenset.refresh_token, issuer);
        } catch (err) {
          tokenset = await authenticate(client_id, client_secret, opener, issuer);
        }
        authsession = makeauthsession(tokenset.id_token, url.resolve(uri, 'api/'));
        panelSession = await makesession(authsession, options);
        return (await panelSession(callurl, callopts));
      }
      throw err;
    }
  };
}
