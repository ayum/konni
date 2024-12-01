self.addEventListener('install', event => {
  self.skipWaiting()
})

const populate = async () => {
  if (self.playlist !== undefined && self.title !== undefined) {
    return
  }
  let { promise: pl_promise, resolve: pl_resolve } = Promise.withResolvers()
  let { promise: tl_promise, resolve: tl_resolve } = Promise.withResolvers()
  const promises = [pl_promise, tl_promise]
  
  const open = indexedDB.open('db', 1)
  open.onsuccess = () => {
    const db = open.result
    const tx = db.transaction('store', 'readonly')
    const store = tx.objectStore('store')
    const getPlaylist = store.get('playlist')
    getPlaylist.onsuccess = () => {
      self.playlist = (getPlaylist.result.value)
      pl_resolve()
    }
    const getTitle = store.get('title')
    getTitle.onsuccess = () => {
      self.title = (getTitle.result.value)
      tl_resolve()
    }
    tx.oncomplete = () => {
      db.close()
    }
  }
  await Promise.all(promises)
}

self.addEventListener('activate', event => {
  event.waitUntil(populate())
})

const player_url = 'https://runtime.video.cloud.yandex.net/player/playlist/'
const player_query = '?autoplay=1&mute=0'
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) {
    return
  }
  if (event.request.method !== 'GET') {
    return
  }
  if (url.pathname == '/' || url.pathname == '') {
    event.respondWith((async () => {
      await populate()
      const response = await fetch(`${player_url}${self.playlist}${player_query}`)
      const html = (await response.text())
        .replace(/<title>[^<]*/i, `<title>${self.title}`)
        .replace(/<\/title>/i, '</title><link rel="manifest" href="manifest.json" />')
      return new Response(html, response)
    })())
    return
  }
})
