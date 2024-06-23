'use strict'

const fastify = require('fastify')()
import {v4 as uuidv4} from 'uuid';

fastify.register(require('@fastify/jwt'), {
  secret: 'supersecret',
  sign: {
    algorithm: 'HS256',
    iss: 'secret-system',
    aud: 'internal-system',
  },
  verify: {
    allowedIss: 'secret-system',
    allowedAud: 'internal-system'
  }
})

fastify.decorate("authenticate", async function(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

fastify.get('/ping', { onRequest: [fastify.authenticate] }, async (request: any, reply: any) => {
  console.info(request.user)
  return 'pong\n'
})

fastify.post('/signup', (request: any, reply: any) => {
  console.info(request.body.user)
  const token = fastify.jwt.sign({
    'owner_uid': request.body.owner_uid,
    'resource_id': request.body.resource_id
  }, {
    'sub': request.body.viewer_uid,
    'expiresIn': '1d',
    'jti': uuidv4()
  })
  reply.send({ token })
})

fastify.listen({ port: 8080 }, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
