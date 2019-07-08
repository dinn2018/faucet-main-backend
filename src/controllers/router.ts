import * as Router from 'koa-router';
import Cert from '../utils/cert'
import TransactionService from './transaction-service'
import AppService from './app-service'
import RecapchaService from './recapcha-service'
import Validator from '../utils/validator'
import { blake2b256 } from 'thor-devkit/dist/cry';
import { Certificate } from 'thor-devkit';
import { logger } from '../utils/logger';

var router = new Router();
router.post("/requests", async (ctx) => {
    let token = ctx.request.body.token
    Validator.validateParameter(token, 'token')
    let annex = ctx.request.body.annex
    Validator.validateParameter(annex, 'annex')
    let domain = annex.domain
    Validator.validateParameter(domain, 'domain')
    let signer = annex.signer
    Validator.validateParameter(signer, 'signer')
    let timestamp = parseFloat(annex.timestamp)
    Validator.validateParameter(timestamp, 'timestamp')
    let signature = ctx.request.body.signature
    Validator.validateParameter(signature, 'signature')
    let purpose = ctx.request.body.purpose
    Validator.validateParameter(purpose, 'purpose')
    let payload = ctx.request.body.payload
    Validator.validateParameter(payload, 'payload')
    let type = payload.type
    Validator.validateParameter(type, 'type')
    let content = payload.content
    Validator.validateParameter(content, 'content')
    let addr = Validator.validateAddress(signer)
    let ip = ctx.request.ip;
    let key = ctx.request.body.key
    let codes = ctx.request.body.codes
    let vet = ctx.config.claimVet
    let thor = ctx.config.claimThor
    if (typeof codes == 'object' && codes != null) {
        await new AppService(ctx.config).verify(key, codes)
        vet = ctx.config.exploreVet
        thor = ctx.config.exploreThor
    }
    let service = new TransactionService(ctx.config)
    await service.balanceApproved()
    let tx = await service.buildTx(addr, vet, thor)
    await service.txApproved(tx.id)
    await service.addressApproved(addr)
    await service.ipApproved(ip)
    let cert = new Cert(domain, timestamp, signer, signature, purpose, type, content)
    Validator.validateTimestamp(timestamp, ctx.config.certificateExpiration)
    Validator.validateCertificate(cert)
    let certHash = blake2b256(Certificate.encode(cert)).toString('hex')
    await service.certHashApproved(certHash)
    let recapchaService = new RecapchaService(ctx.config)
    let score = await recapchaService.verifyRecapcha(token)
    await service.insertTx(tx.id, addr, ip, certHash, vet, thor)
    await service.send(tx)
    ctx.body = {
        id: tx.id.toString(),
        message: `You have now successfully claimed ${vet} VET and ${thor} VTHO to ${signer}`
    };
    logger.info(`IP=${ip} Address=${signer} Score=${score}`)
});

router.get("/apps", async (ctx) => {
    let service = new AppService(ctx.config)
    let result = await service.randoms()
    ctx.body = {
        result,
        message: `get apps successfully`
    };
})

export default router;