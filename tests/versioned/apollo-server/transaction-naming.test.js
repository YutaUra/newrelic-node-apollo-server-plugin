/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')

const utils = require('@newrelic/test-utilities')
const { getTypeDefs, resolvers } = require('../data-definitions')
const { createTransactionTests } = require('../transaction-tests')

tap.test('apollo-server: transaction naming', (t) => {
  t.autoend()

  let server = null
  let serverUrl = null
  let helper = null

  t.beforeEach((done) => {
    // load default instrumentation. express being critical
    helper = utils.TestAgent.makeInstrumented()
    const createPlugin = require('../../../lib/create-plugin')
    const nrApi = helper.getAgentApi()

    // TODO: eventually use proper function for instrumenting and not .shim
    const plugin = createPlugin(nrApi.shim)

    // Do after instrumentation to ensure express isn't loaded too soon.
    const { ApolloServer, gql } = require('apollo-server')
    server = new ApolloServer({
      typeDefs: getTypeDefs(gql),
      resolvers,
      plugins: [plugin]
    })

    server.listen().then(({ url }) => {
      serverUrl = url

      t.context.helper = helper
      t.context.serverUrl = serverUrl
      done()
    })
  })

  t.afterEach((done) => {
    server.stop()

    helper.unload()
    server = null
    serverUrl = null
    helper = null

    clearCachedModules(['express', 'apollo-server'], () => {
      done()
    })
  })

  createTransactionTests(t)
})

function clearCachedModules(modules, callback) {
  modules.forEach((moduleName) => {
    const requirePath = require.resolve(moduleName)
    delete require.cache[requirePath]
  })

  callback()
}
