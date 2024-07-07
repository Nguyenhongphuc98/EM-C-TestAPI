

const { publicEncrypt } = require('crypto');
const hash = require("pbkdf2-password")();
const { AES, enc } = require("crypto-js");
const io = require('socket.io-client');


const USERNAME = "admin@admin.com";
const PASSWORD = "admin@2024!#$";
let ENCRYPTKEY = "";

class DataTransform {
  static aesEncrypt(rawData) {
    const ciphertext = AES.encrypt(JSON.stringify(rawData), ENCRYPTKEY).toString();

    return ciphertext;
  }

  static aesDecrypt(encryptedData) {
    if (Object.keys(encryptedData).length == 0) return encryptedData;

    const bytes = AES.decrypt(encryptedData, ENCRYPTKEY);
    const rawData = JSON.parse(bytes.toString(enc.Utf8));

    return rawData;
  }

  static encryptWithPublicKey(data, publicKey) {
    try {
      // Convert data to a buffer (if it's not already)
      const bufferData = Buffer.from(data, 'utf8');

      // Encrypt the data using public key
      const encryptedData = publicEncrypt(publicKey, bufferData);

      return encryptedData.toString('base64'); // Convert to base64 for easier handling
    } catch (error) {
      console.error('Encryption Error:', error);
      return null; // Handle encryption errors appropriately
    }
  }

}

function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // Characters to use for random string
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}


// const Host = "http://164.90.186.39:8080";
const Host = "http://localhost:8080";


function startSocket(sessionId) {
  const socket = io(Host);

  socket.on('authenticate', (data) => {
    console.log('Authen', data);
  });

  socket.on('connect', () => {
    console.log('Connected to server');

    socket.emit("authenticate", sessionId);
  });

  // We have 2 chanel: export | weigh
  // SV Currently fake interval signal to export for temp check.
  socket.on('export', (data) => {
    console.log('Receive export data encrypted:', data);
    console.log('Receive export data raw:', DataTransform.aesDecrypt(data.data));
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
}

function reqlogin() {
  return fetch(Host + "/api/v1/reqlogin", {
    method: 'get'
  }).then(v => {
    // console.log('req login ', v);
    v.json().then(resp => {

      const pubKey = resp.data.publicKey;
      ENCRYPTKEY = generateRandomString(16);

      const auth = {
        username: USERNAME,
        password: PASSWORD,
        key: ENCRYPTKEY,
      };

      const sessionId = resp.data.sessionId;
      const authenData = DataTransform.encryptWithPublicKey(JSON.stringify(auth), pubKey);
      console.log('req login', sessionId, ' || ',  authenData);
      login(sessionId, authenData);
    });
  }).catch(e => {
    console.log('req login err', e);
  });
}

function login(sessionId, authenData) {
  fetch(Host + "/api/v1/login", {
    method: 'post',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      auth: authenData
    })
  }).then(v => {
    v.json().then(async res => {
      console.log('key using to secure data', ENCRYPTKEY);
      console.log('user data raw: ', res);
      console.log('user data: ', DataTransform.aesDecrypt(res.data))

      // authen(sessionId).then(() => logout(sessionId)).then(() => authen(sessionId));
      startSocket(sessionId);

      setTimeout(() => {
        logout(sessionId);
      }, 15000);
    })

  }).catch(e => {
    console.log('login err', e);
  });
}

function logout(sessionId) {
  fetch(Host + "/api/v1/logout", {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
  }).then(v => {
    v.json().then(res => {
      console.log('logged out ', res);
    })

  }).catch(e => {
    console.log('logout err', e);
  });
}

function authen(sessionId) {
  return fetch(Host + "/api/v1/authenticate", {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
  }).then(v => {
    return v.json().then(res => {
      console.log('authen raw: ', res);
      console.log('authen data: ', DataTransform.aesDecrypt(res.data));
    })

  }).catch(e => {
    console.log('authen err', e);
  });
}

reqlogin();


// Keep node running
const interval = setInterval(() => {
}, 3000); 