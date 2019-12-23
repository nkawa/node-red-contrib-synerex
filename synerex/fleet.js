const Sxutil = require('../sxutil.js')

const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
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
  function FleetNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    var util = new Sxutil()

    const nodesvClient = new util.nodeapi.Node(
      program.nodesrv,
      grpc.credentials.createInsecure()
    )
    const NodeType = Protobuf.Enum.fromDescriptor(util.nodeapi.NodeType.type)

    nodesvClient.RegisterNode(
      {
        node_name: program.hostname,
        node_type: NodeType.values.PROVIDER,
        channelTypes: [channel_RIDESHARE] // RIDE_SHARE
      },
      (err, resp) => {
        if (!err) {
          console.log('NodeServer connect success!')
          console.log(resp)
          console.log('Node ID is ', resp.node_id)
          console.log('Server Info is ', resp.server_info)
          console.log('KeepAlive is ', resp.keepalive_duration)

          util.connectSynerexServer(resp)

          util.startKeepAlive(nodesvClient, resp)
        } else {
          console.log('Error connecting NodeServ.')
          console.log(err)
        }
      }
    )
  }
  RED.nodes.registerType('Fleet', FleetNode)
}
