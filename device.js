const debug = require('debug')('airplay-sonos:device')
const NodeTunes = require('nodetunes')
const Nicercast = require('nicercast')
const events = require('events')
const ip = require('ip')

class Device extends events.EventEmitter {
  constructor(name, sonos) {
    super()
    this.deviceName = name
    this.sonos = sonos
    this.name = `Sonos @ ${ this.deviceName }`

    this.clientConnected = this.clientConnected.bind(this)
    this.airPlay = this.airPlay.bind(this)
    this.sonosMetadata = this.sonosMetadata.bind(this)
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)

    this.airPlay()
  }

  airPlay() {
    this.airPlayServer = new NodeTunes({
      serverName: this.name
    })

    this.airPlayServer.on('clientConnected', this.clientConnected)
    this.airPlayServer.on('clientDisconnected', this.stop)

    this.airPlayServer.on('volumeChange', (volume) => {
      const sonosVolume = 100 - Math.floor(-1 * (Math.max(volume, -30) / 30) * 100)
      this.sonos.setVolume(sonosVolume, () => { })
    })

    this.start()
  }

  clientConnected(stream) {
    if (stream) {
      debug(`client connected on ${ this.deviceName }`)
      this.icecastServer = new Nicercast(stream, {
        name: this.name
      })

      this.airPlayServer.on('metadataChange', (metadata) => {
        if (metadata.minm) {
          const asarPart = metadata.asar ? ` - ${ metadata.asar }` : ''
          const asalPart = metadata.asal ? ` (${ metadata.asal })` : ''
          this.icecastServer.setMetadata(metadata.minm + asarPart + asalPart)
        }
      })

      this.icecastServer.start(null, (port) => {
        this.sonos.play({
          uri: `x-rincon-mp3radio://${ ip.address() }:${ port }/listen.m3u`,
          metadata: this.sonosMetadata()
        })
      })
    }
  }

  sonosMetadata() {
    return `<?xml version="1.0"?>
      <DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">
      <item id="R:0/0/49" parentID="R:0/0" restricted="true">
      <dc:title>AirPlay</dc:title>
      <upnp:class>object.item.audioItem.audioBroadcast</upnp:class>
      <desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON65031_</desc>
      </item>
      </DIDL-Lite>`;
  }

  start() {
    this.airPlayServer.start()
  }

  stop() {
    this.sonos.stop(() => { })
    this.icecastServer.stop()
  }
}

module.exports = Device
