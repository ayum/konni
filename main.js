const ciphertext = 'e4403080c75807b4f369df616247f34ec228bc649871c3e122d268122fa24fd94164871d'
const iv = 'f6d1270b15cd4d1f0fcdeba2376d64b9'
const salt = 'konni'

function hex2ab(hexString) {
    hexString = hexString.replace(/^0x/, '')
    if (hexString.length % 2 != 0) {
        console.log('WARNING: expecting an even number of characters in the hexString')
    }
    var bad = hexString.match(/[G-Z\s]/i)
    if (bad) {
        console.log('WARNING: found non-hex characters', bad)
    }
    var pairs = hexString.match(/[\dA-F]{2}/gi)
    var integers = pairs.map(function(s) {
        return parseInt(s, 16)
    })
    
    var array = new Uint8Array(integers)
    
    return array.buffer
}

function getKeyMaterial() {
  const password = window.prompt("Enter your password")
  const enc = new TextEncoder()
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  )
}

async function decrypt(keyMaterial, ciphertext, iv, salt) {
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  )

  return window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
}


const playlist = localStorage.getItem('playlist') || (new TextDecoder("utf-8")).decode(await decrypt(await getKeyMaterial(), hex2ab(ciphertext), hex2ab(iv), (new TextEncoder()).encode(salt)))

const open = indexedDB.open('db', 1)
open.onupgradeneeded = () => {
    const db = open.result
    const store = db.createObjectStore('store', {keyPath: 'id'})
};

open.onsuccess = () => {
  const db = open.result;
  const tx = db.transaction('store', 'readwrite')
  const store = tx.objectStore('store')
  store.put({id: 'title', value: document.getElementsByTagName('title')[0].innerText})
  store.put({id: 'playlist', value: playlist})
  const getPlaylist = store.get('playlist')
  getPlaylist.onsuccess = () => {
    localStorage.setItem('playlist', playlist)
    console.log(getPlaylist.result.value)
  }
  tx.oncomplete = () => {
    db.close()
  }
}

navigator.serviceWorker.register('./sw.js', { scope: '/', type: 'module' })
