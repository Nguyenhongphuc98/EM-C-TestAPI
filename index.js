

const { publicEncrypt } = require('crypto');
const hash = require("pbkdf2-password")();
const { AES, enc } = require("crypto-js");
const io = require('socket.io-client');
const { bundleCodes } = require('./bundlecode');


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
  return fetch(Host + `/api/v1/login?sessionid=${sessionId}`, {
    method: 'post',
    credentials: "include",
    headers: {
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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
      'Content-Type': 'text/plain',
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

function createPKL(sessionId) {
  return fetch(Host + `/api/v1/pkl?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        name: "Don Hang 22/11",
        attachedInvoiceId: "INVOID_ID",
        date: Date.now(),
        from: "Ha Noi",
        to: "Lon Don",
        etdFactory: "ETD FAct",
        etdPort: 'port',
        eta: 'etaaa'
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("create pkl", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function getPKLs(sessionId) {
  // get all pkl have invoice like INVOICE and create before ts
  // /api/v1/pkl?kw=Do&ts=" + '2024-07-20T12:05:24.000Z&wstt=1
  /**
   * WeighStatus {
      NotStart = 0,
      Weighting = 1,
      Finished = 2,
    }
   */
  return fetch(Host + `/api/v1/pkl?sessionid=${sessionId}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("get pkls", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function getPKL(sessionId) {
  // get all pkl have invoice like INVOICE and create before ts
  return fetch(Host + `/api/v1/pkl/1?sessionid=${sessionId}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then(result => {
    return result.json().then(v => {
      // console.log('bbb', v);
      console.log("get pkl", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function createPKLItems(sessionId) {
  return fetch(Host + `/api/v1/item?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        pkl: 3,
        items: [{
          packageSeries: [1, 4],
          packageId: "GLFS76MWM",
          po: "129173-NCH",
          itemsInPackage: 20,
          itemsUnit: "PCS",
          netWeight: 5.2,
          grossWeight: 5.5,
          netWeightUnit: "KGS",
          grossWeightUnit: "KGS",
          width: 24,
          length: 54,
          height: 237,
          sizeUnit: "CM",
        },
        {
          packageSeries: [5, 7],
          packageId: "ABCS76MWM",
          po: "129173-NCH",
          itemsInPackage: 25,
          itemsUnit: "PCS",
          netWeight: 10,
          grossWeight: 15.5,
          netWeightUnit: "KGS",
          grossWeightUnit: "KGS",
          width: 24,
          length: 54,
          height: 237,
          sizeUnit: "CM",
        }]
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("create pkl items", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function getPKLItems(sessionId) {
  // get all pkl item in pkl have packageid like Do and create before ts
  ///api/v1/item?pkl=1&kw=Do&ts=" + '2024-07-20T13:01:53.000Z
  return fetch(Host + `/api/v1/item?sessionid=${sessionId}&pkl=3&page=1`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("get pk items", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function deleterPkl(sessionId) {
  return fetch(Host + "/api/v1/pklm", {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        pid: 2,
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "delete",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("delete pkl", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function addBundleSetting(sessionId) {
  return fetch(Host + `/api/v1/setting/bundle?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        settings: bundleCodes,
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "add",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("add bundle setting", v, DataTransform.aesDecrypt(v.data));
    });
  });
}


function getBundleSettings(sessionId) {
  return fetch(Host + `/api/v1/setting/bundle?sessionid=${sessionId}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("get bundle settings", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function deleteBundleSetting(sessionId) {
  return fetch(Host + "/api/v1/setting/bundle", {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        settings: [{ code: "ABDS", amount: 1 }],
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "delete",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("remove bundle setting", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function creatExport(sessionId) {
  return fetch(Host + `/api/v1/export?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        pklIds: [4],
        name: "Export 5/8/24",
        gate: "GATE 123",
        fcl: "FCL Phuc dep trai",
        contNum: "AB45-CONTNUM",
        contSize: "CONT -SIZE",
        vehicle: "TRACK",
        seal: "SEALLL",
        customer: "CTY AKBF",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("create export", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function getExport(sessionId) {
  // get all pkl item in pkl have packageid like MWM and create before ts
  return fetch(Host + `/api/v1/export/8?sessionid=${sessionId}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("get export", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function getExports(sessionId) {
  // get all pkl export have export name like Ex and create before ts and status is 1
  /**
   *
   *  ExportStatus {
        Imported = 0,
        Exporting = 1,
        Exported = 2,
      }
   */
  // /api/v1/export?kw=Ex&st=1&ts=2024-07-20T13:01:53.000Z
  return fetch(Host + `/api/v1/export?sessionid=${sessionId}&ts=${Date.now()}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("get export items", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function finishExport(sessionId) {
  return fetch(Host + `/api/v1/exportm?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        eid: 1,
        reqid: generateRandomString(16),
        createat: Date.now(),
        type: "exported",
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("finishExport", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

// Dung de lay report va lay data lam ma QR
function getSubitems(sessionId) {
  return fetch(Host + "/api/v1/sitem?pkl=1", {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    }
  }).then(result => {
    return result.json().then(v => {
      console.log("getSubitems", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function startWeigh(sessionId) {
  return fetch(Host + `/api/v1/sweigh?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        pklid: 3,
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("startWeigh", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function endWeigh(sessionId) {
  return fetch(Host + `/api/v1/eweigh?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        pklid: 3,
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("endWeigh", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function getWeigh(sessionId) {
  // get pklid.
  return fetch(Host + "/api/v1/weigh/1", {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    }
  }).then(result => {
    return result.json().then(v => {
      console.log("getWeigh", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function reportByInv(sessionId) {
  // get pklid.
  return fetch(Host + `/api/v1/report/inv/BPSVN2408?sessionid=${sessionId}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    }
  }).then(result => {
    return result.json().then(v => {
      console.log("reportByInv", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function reportByPO(sessionId) {
  const po = 'PO#:BPS 12160059';
  const encodedPo = encodeURIComponent(po);
  return fetch(Host + `/api/v1/report/po/${encodedPo}?sessionid=${sessionId}&fromDate=${Date.now() - 24*60*60*1000}&toDate=${Date.now()}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    }
  }).then(result => {
    return result.json().then(v => {
      console.log("reportByPO", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function reportExportByDate(sessionId) {
  return fetch(Host + `/api/v1/report/ect?sessionid=${sessionId}&fromDate=${Date.now() - 20*24*60*60*1000}&toDate=${Date.now()}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("reportExportByDate", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function reportExportSummaryByDate(sessionId) {
  return fetch(Host + `/api/v1/report/est?sessionid=${sessionId}&fromDate=${Date.now() - 20*24*60*60*1000}&toDate=${Date.now()}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("reportExportSummaryByDate", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function reportExportSummaryByCustomer(sessionId) {
  return fetch(Host + `/api/v1/report/esc/${encodeURIComponent("CTYXAKBF")}?sessionid=${sessionId}&fromDate=${Date.now() - 20*24*60*60*1000}&toDate=${Date.now()}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
      'sessionid': sessionId,
    },
  }).then(result => {
    return result.json().then(v => {
      console.log("reportExportSummaryByCustomer", v, DataTransform.aesDecrypt(v.data));
    });
  });
}


function reportOverview(sessionId) {
  return fetch(Host + `/api/v1/report/overview?sessionid=${sessionId}`, {
    method: "get",
    headers: {
      'Content-Type': 'text/plain',
    }
  }).then(result => {
    return result.json().then(v => {
      console.log("reportOverview", v, DataTransform.aesDecrypt(v.data));
    });
  });
}

function updateWeighPC(sessionId) {
  return fetch(Host + `/api/v1/weigh/5?sessionid=${sessionId}`, {
    method: "post",
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      data: DataTransform.aesEncrypt({
        sid: 630,
        weigh: 5.9,
        reqid: generateRandomString(16),
      })
    })
  }).then(result => {
    return result.json().then(v => {
      console.log("updateWeighPC", v, DataTransform.aesDecrypt(v.data));
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

async function loginAdminCreatePKL() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await createPKL(sessionId, authData);
}

async function loginAdminGetPKLs() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await getPKLs(sessionId, authData);
}

async function loginAdminGetPKL() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await getPKL(sessionId, authData);
}


async function loginAdminCreatePKLItems() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await createPKLItems(sessionId, authData);
}

async function loginAdminGetPKLItems() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await getPKLItems(sessionId, authData);
}

async function loginAdminDeletePKL() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await deleterPkl(sessionId, authData);
}

async function testPKL() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await createPKL(sessionId, authData);
  await getPKLs(sessionId);
  await getPKL(sessionId);
}

async function testPKLItems() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await createPKLItems(sessionId, authData);
  await getPKLItems(sessionId);
}

async function testBundleSetting() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await addBundleSetting(sessionId);
  await getBundleSettings(sessionId);
  // await deleteBundleSetting(sessionId);
  // await getBundleSettings(sessionId);
}

async function testExport() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  // await creatExport(sessionId);
  // await getExport(sessionId);
  await getExports(sessionId);
  // await finishExport(sessionId);
}

async function loginGetSubitems() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await getSubitems(sessionId);
}

async function loginStartWeigh() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await startWeigh(sessionId);
}

async function loginGetWeigh() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await getWeigh(sessionId);
}

async function loginEndWeigh() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await endWeigh(sessionId);
}

async function loginReport() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  // await reportByInv(sessionId);
  // await reportByPO(sessionId);
  // await reportExportByDate(sessionId);
  // await reportExportSummaryByDate(sessionId);
  await reportExportSummaryByCustomer(sessionId);
}

async function loginReportOverView() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await reportOverview(sessionId);
}


async function loginUpdateWeighPC() {
  const [sessionId, authData] = await reqlogin();
  await login(sessionId, authData);
  await updateWeighPC(sessionId);
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
// loginUsernLockAcc();

// loginAdminCreatePKL();
// loginAdminGetPKL();
// loginAdminGetPKLs();

// loginAdminCreatePKLItems();
// loginAdminGetPKLItems();
// loginAdminDeletePKL();
// testBundleSetting();

// testPKL();
// testPKLItems();
// testExport();

// loginGetSubitems();
// loginStartWeigh();
// loginGetWeigh();
// loginEndWeigh();
// loginReport();

// loginReportOverView();
loginUpdateWeighPC();