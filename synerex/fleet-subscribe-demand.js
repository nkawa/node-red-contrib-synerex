const Sxutil = require('../sxutil.js')

const grpc = require('grpc')
const program = require('commander')
const Protobuf = require('protobufjs')

const channel_RIDESHARE = 1 // should read from synerex_proto .

program
  .version('1.0.0')
  .option('-s, --nodesrv [address]', 'Node ID Server', '127.0.0.1:9990')
  .option(
    '-n, --hostname [name]',
    'Hostname for provider',
    'NODE-RED-KARA-KITA'
  )
  .parse(process.argv)

module.exports = function (RED) {
  'use strict'
  function FleetSubscribeDemandNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    var util = new Sxutil()

    const nodesvClient = new util.nodeapi.Node(
      program.nodesrv,
      grpc.credentials.createInsecure()
    )
    const NodeType = Protobuf.Enum.fromDescriptor(util.nodeapi.NodeType.type)

    node.status({ fill: 'green', shape: 'dot', text: 'request...' })
    // connecting server
    nodesvClient.RegisterNode(
      {
        node_name: program.hostname,
        node_type: NodeType.values.PROVIDER,
        channelTypes: [channel_RIDESHARE] // RIDE_SHARE
      },
      (err, resp) => {
        if (!err) {
          node.status({ fill: 'green', shape: 'dot', text: 'connected' })
          console.log('NodeServer connect success!')
          console.log(resp)
          console.log('Node ID is ', resp.node_id)
          console.log('Server Info is ', resp.server_info)
          console.log('KeepAlive is ', resp.keepalive_duration)

          const client = util.synerexServerClient(resp)

          util.fleetSubscribeDemand(client, resp.node_id, function (
            err,
            success
          ) {
            if (err) {
              console.log('error!')
              node.status({ fill: 'red', shape: 'dot', text: 'error' })
            } else {
              // console.log('success subsc')
              // console.log(success)
              // console.log(success.coord)
              // console.log(success.coord.lat)
              // console.log(success.coord.lon)
              // console.log(success.angle)
              // console.log(success.speed)
              var result = {
                coord: {
                  lat: success.coord.lat,
                  lon: success.coord.lon
                },
                angle: success.angle,
                speed: success.speed
              }
              node.send({ payload: result })
            }
          })
        } else {
          console.log('Error connecting NodeServ.')
          node.status({ fill: 'red', shape: 'dot', text: 'error' })
          console.log(err)
        }
      }
    )

    node.on('close', function () {
      node.status({})
    })
  }
  RED.nodes.registerType('FleetSubscribeDemand', FleetSubscribeDemandNode)
}
