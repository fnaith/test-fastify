'use strict'

import {v4 as uuidv4} from 'uuid'
const crypto = require('crypto');
const mongoose = require('mongoose');
const undici = require('undici');
import { ProxyAgent } from 'undici'

const algorithm = 'AES-256-CBC';
const secrateKey = '11112222333344445555666677778888';
const encoding = 'hex'

function splitEncryptedText( encryptedText: string ) {
  return {
    ivString: encryptedText.slice( 0, 32 ),
    encryptedDataString: encryptedText.slice( 32 )
  }
}

function encrypt( plaintext: string ) {
  try {
    const iv = crypto.randomBytes( 16 )
    const cipher = crypto.createCipheriv( algorithm, secrateKey, iv )

    const encrypted = Buffer.concat( [
      cipher.update(
        plaintext, 'utf-8'
      ),
      cipher.final()
    ])

    return iv.toString( encoding ) + encrypted.toString( encoding )
  } catch (e) {
      return String(e)
  }
}

function decrypt( cipherText: string ) {
  const {
    encryptedDataString,
    ivString,
  } = splitEncryptedText( cipherText )

  try {
    const iv = Buffer.from( ivString, encoding )
    const encryptedText = Buffer.from( encryptedDataString, encoding )

    const decipher = crypto.createDecipheriv( algorithm, secrateKey, iv )

    const decrypted = decipher.update( encryptedText );
    return Buffer.concat( [ decrypted, decipher.final() ] ).toString()
  } catch (e) {
    return String(e)
  }
}

const cipherText = encrypt('some clear text data')
const data = decrypt(cipherText)
console.log(`${cipherText} ${data}`)

initDb().catch(err => console.log(err));
async function initDb() {
  await mongoose.connect('mongodb://127.0.0.1:27017/test');
}

const fastify = require('fastify')()

const createError = require('@fastify/error')

// async function initRate() {
//   await fastify.register(import('@fastify/rate-limit'), {
//     global: true,
//     max: 1,
//     timeWindow: 600000,
//     keyGenerator: function (request: any) {
//       console.warn(request.ip)
//       return request.ip
//     }
//   })
// }
// await initRate().catch(err => console.log(err));

const { fastifySchedulePlugin } = require('@fastify/schedule');
const { SimpleIntervalJob, AsyncTask } = require('toad-scheduler');

const task = new AsyncTask(
    'simple task',
    async () => { console.warn('666') },
    (err: any) => { /* handle errors here */ }
)
const job = new SimpleIntervalJob({ seconds: 20 }, task)

fastify.register(fastifySchedulePlugin);

fastify.ready().then(() => {
    fastify.scheduler.addSimpleIntervalJob(job)
})



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

fastify.decorate("jwtAuth", async function(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

fastify.decorate("internalAuth", async function(request: any, reply: any) {
  try {
    const authId = request.headers['x-mlp-auth-id']
    const authKey = request.headers['x-mlp-auth-key']
    console.info()
    if (authId != authKey) {
      const CustomError = createError('ERROR_CODE', '%s %s', 401)
      reply.send(new CustomError(authId, authKey))
    }
  } catch (err) {
    reply.send(err)
  }
})

const proxyAgent = new ProxyAgent('http://127.0.0.1:8080')

fastify.get('/health', async (request: any, reply: any) => {
  // const {
  //   statusCode,
  //   headers,
  //   trailers,
  //   body
  // } = await undici.request('http://127.0.0.1:8080/health2')
  // return reply.send(body)
  const {
    statusCode,
    body
  } = await undici.request('http://127.0.0.1:8080/health2'/*, { dispatcher: proxyAgent }*/)
  return reply.code(statusCode).send(body)
})

fastify.get('/health2', async (request: any, reply: any) => {
  return 'ok'
})

fastify.get('/ping', { onRequest: [fastify.jwtAuth, fastify.internalAuth] }, async (request: any, reply: any) => {
  console.info(request.user)
  return 'pong'
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

// fastify.get('/user/:id', async function (request: any, reply: any) {
//   const users = fastify.mongo.db.collection('keys')

//   const id = new fastify.mongo.ObjectId(request.params.id)
//   try {
//     const user = await users.findOne({ id })
//     return user
//   } catch (err) {
//     return err
//   }
// })

import OpenAI from "openai";
var stream = require('stream')

export const searchGPT = async (question: any) => {
  const openai = new OpenAI();

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: question }],
    model: "gpt-3.5-turbo",
  });

  return chatCompletion.choices[0].message.content;
}

process.env.OPENAI_API_KEY="sk-proj-2jCIx0qPkwYnwfzcih7aT3BlbkFJYxEloELVNs0FfnZ6Iokh"

const search = async (request: any) => {
  const { question } = request.query;

  if (!question) {
    return { message: "invalid" };
  }

  const message = await searchGPT(question);
  return { message };
}

const gptRoutes = (fastify: any, reply: any, done: any) => {
  fastify.get("/gpt", search);
  done();
};

fastify.register(gptRoutes, { prefix: "v1" })

fastify.get('/stream', function (request: any, reply: any) {

	// Create a buffer to hold the response chunks
	var buffer = new stream.Readable();
	buffer._read = ()=>{};

	// Generate 5 chunks with 1 second interval
	var count = 5;
	var emit = () => {
		var data = `Hello World ${count}`
		buffer.push(data);

		count--;
		if (count > 0) {
			setTimeout(emit, 1000);
		}
		else {
			console.log('end sending.');
			buffer.push(null);
		}
	};

	emit();
	reply.type('text/html').send(buffer)
})

fastify.get('/stream/gpt', async function (request: any, reply: any) {
  const openai = new OpenAI();
  const { question } = request.query;
  const streamCompletions = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: question }],
    stream: true,
  });

	const buffers = []
  for await (const chunk of streamCompletions) {
    var data = chunk.choices[0]?.delta?.content || ''
    buffers.push(data)
  }

	reply.type('text/html').send(buffers.join(''))
})

fastify.listen({ port: 8080 }, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
