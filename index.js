

const { publicEncrypt } = require('crypto');
const hash = require("pbkdf2-password")();
const { AES, enc } = require("crypto-js");
const io = require('socket.io-client');


const USERNAME = "admin@admin.com";
const PASSWORD = "admin@2024!#$";

const USER_USERNAME = "phucdeptrai@gmail.com";
// const USER_PASSWOD = "hehe_!passs";
const USER_PASSWOD = "z2SiIVcm";

// const Host = "http://164.90.186.39:8080";
const Host = "http://localhost:8080";


let createdUserID = 2;

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

function reqlogin(username = USERNAME, password = PASSWORD) {
  return fetch(Host + "/api/v1/reqlogin", {
    method: 'get'
  }).then(v => {
    // console.log('req login ', v);
    return v.json().then(resp => {

      const pubKey = resp.data.publicKey;
      ENCRYPTKEY = generateRandomString(16);

      const auth = {
        username,
        password,
        key: ENCRYPTKEY,
      };

      const sessionId = resp.data.sessionId;
      const authenData = DataTransform.encryptWithPublicKey(JSON.stringify(auth), pubKey);
      console.log('req login', sessionId, ' || ', authenData);
      return [sessionId, authenData];
    });
  }).catch(e => {
    console.log('req login err', e);
  });
}

function login(sessionId, authenData) {
  return fetch(Host + "/api/v1/login", {
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
    return v.json().then(async res => {
      console.log('key using to secure data', ENCRYPTKEY);
      console.log('user data raw: ', res);
      console.log('user data: ', DataTransform.aesDecrypt(res.data))
    });

  }).catch(e => {
    console.log('login err', e);
  });
}

function logout(sessionId) {
  return fetch(Host + "/api/v1/logout", {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
  }).then(v => {
    return v.json().then(res => {
      console.log('logged out ', res);
    });

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

function createUSer(sessionId) {
  return fetch(Host + "/api/v1/user", {
    method: "post",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        username: USER_USERNAME,
        password: USER_PASSWOD,
        displayName: "Phuc dep traii",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      const user = DataTransform.aesDecrypt(v.data);
      createdUserID = user.id;
      console.log("create user", v, user);
    });
  });
}

function allUSers(sessionId) {
  return fetch(Host + "/api/v1/user", {
    method: "get",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("get users", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function updateDispalyName(sessionId) {
  return fetch(Host + "/api/v1/user/" + createdUserID, {
    method: "put",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        displayName: "new nameeee"
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("update users", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function updatePassword(sessionId) {
  return fetch(Host + "/api/v1/user/" + createdUserID, {
    method: "put",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        password: "newpassshahaa",
        oldpassword: "USER_PASSWOD",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("update users", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function resetPassword(sessionId) {
  return fetch(Host + "/api/v1/admin", {
    method: "post",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        uid: createdUserID,
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "reset",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("reset pass", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function lockAccount(sessionId) {
  return fetch(Host + "/api/v1/admin", {
    method: "post",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        uid: createdUserID,
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "lock",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("lock account", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function unlockAccount(sessionId) {
  return fetch(Host + "/api/v1/admin", {
    method: "post",
    headers: {
      'Content-Type': 'application/json',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        uid: createdUserID,
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "unlock",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("lock account", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

async function loginAuthLogoutAuth() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await authen(sessionId);
  await logout(sessionId);
  await authen(sessionId);
}

async function loginAuthSocketLogout() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await authen(sessionId);
  startSocket(sessionId);
  setTimeout(() => {
    logout(sessionId);
  }, 15000);
}

async function loginAdminCreateUser() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await createUSer(sessionId);
}

async function loginUserCreateUser() {
  // Should fail because only admin can create account
  const [sessionId, authData] = await reqlogin(USER_USERNAME, USER_PASSWOD);
  await login(sessionId, authData);
  await createUSer(sessionId);
}

async function loginAdminGetAllUses() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await allUSers(sessionId);
}


async function loginUserGetAllUses() {
  // Should fail because only admin can get all account
  const [sessionId, authData] = await reqlogin(USER_USERNAME, USER_PASSWOD);
  await login(sessionId, authData);
  await allUSers(sessionId);
}


async function loginUserUpdateDisplaynameMe() {
  const [sessionId, authData] = await reqlogin(USER_USERNAME, USER_PASSWOD);
  await login(sessionId, authData);
  await updateDispalyName(sessionId);
}

async function loginUserUpdatePassMe() {
  const [sessionId, authData] = await reqlogin(USER_USERNAME, USER_PASSWOD);
  await login(sessionId, authData);
  await updatePassword(sessionId);
}

async function loginAdminResetPass() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await resetPassword(sessionId);
}


async function loginUserResetPass() {
  // Should fail because only admin can reset pass
  const [sessionId, authData] = await reqlogin(USER_USERNAME, USER_PASSWOD);
  await login(sessionId, authData);
  await resetPassword(sessionId);
}

async function loginAdminLockAcc() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await lockAccount(sessionId);
}


async function loginAdminUnLockAcc() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await unlockAccount(sessionId);
}

async function loginUsernLockAcc() {
  const [sessionId, authData] = await reqlogin(USER_USERNAME, USER_PASSWOD);
  await login(sessionId, authData);
  await lockAccount(sessionId);
}



// Keep node running
// const interval = setInterval(() => {
// }, 3000); 


// START test
// loginAuthLogoutAuth();
// loginAuthSocketLogout();
// loginUserCreateUser(); // should fail
// loginAdminCreateUser();
// loginAdminGetAllUses();
// loginUserGetAllUses(); //should fail
// loginUserUpdateDisplaynameMe();

// loginUserUpdatePassMe();

// loginAdminResetPass();
// loginUserResetPass(); // should fail
// loginAdminLockAcc();
// loginAdminUnLockAcc();
loginUsernLockAcc();