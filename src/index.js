'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const crypto = require('crypto');
const mongoose = require('mongoose');
const algorithm = 'AES-256-CBC';
const secrateKey = '11112222333344445555666677778888';
const encoding = 'hex';
function splitEncryptedText(encryptedText) {
    return {
        ivString: encryptedText.slice(0, 32),
        encryptedDataString: encryptedText.slice(32)
    };
}
function encrypt(plaintext) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, secrateKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf-8'),
            cipher.final()
        ]);
        return iv.toString(encoding) + encrypted.toString(encoding);
    }
    catch (e) {
        return String(e);
    }
}
function decrypt(cipherText) {
    const { encryptedDataString, ivString, } = splitEncryptedText(cipherText);
    try {
        const iv = Buffer.from(ivString, encoding);
        const encryptedText = Buffer.from(encryptedDataString, encoding);
        const decipher = crypto.createDecipheriv(algorithm, secrateKey, iv);
        const decrypted = decipher.update(encryptedText);
        return Buffer.concat([decrypted, decipher.final()]).toString();
    }
    catch (e) {
        return String(e);
    }
}
const cipherText = encrypt('some clear text data');
const data = decrypt(cipherText);
console.log(`${cipherText} ${data}`);
initDb().catch(err => console.log(err));
function initDb() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose.connect('mongodb://127.0.0.1:27017/test');
    });
}
const fastify = require('fastify')();
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
});
fastify.register(require('@fastify/auth'));
// fastify.decorate("jwtAuth", async function(request: any, reply: any) {
//   try {
//     await request.jwtVerify()
//   } catch (err) {
//     reply.send(err)
//   }
// })
function jwtAuth(request, reply, done) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield request.jwtVerify();
            done();
        }
        catch (err) {
            reply.send(err);
            done(err);
        }
    });
}
fastify.get('/ping', { onRequest: fastify.auth([fastify.jwtAuth]) }, (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    console.info(request.user);
    return 'pong\n';
}));
fastify.post('/signup', (request, reply) => {
    console.info(request.body.user);
    const token = fastify.jwt.sign({
        'owner_uid': request.body.owner_uid,
        'resource_id': request.body.resource_id
    }, {
        'sub': request.body.viewer_uid,
        'expiresIn': '1d',
        'jti': (0, uuid_1.v4)()
    });
    reply.send({ token });
});
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
fastify.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
