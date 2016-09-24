#!/usr/bin/env node

const debug = require('debug')('airplay-sonos')
const sonos = require('sonos')

const Device = require('./device')

sonos.search((device, model) => {
  device.getZoneAttrs((err, attrs) => {
    device.getZoneInfo((err, info) => {
      debug(`sonos found on ${ info.IPAddress } (${ attrs.CurrentZoneName })`)
      new Device(attrs.CurrentZoneName, new sonos.Sonos(info.IPAddress))
    })
  })
})
