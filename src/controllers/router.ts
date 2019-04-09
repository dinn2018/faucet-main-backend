import * as Router from 'koa-router';
import Cert from '../utils/cert'
import TransactionService from './transaction-service'
import RecapchaService from './recapcha-service'
import Validator from '../utils/validator'
import { blake2b256 } from 'thor-devkit/dist/cry';
import { Certificate } from 'thor-devkit';
import { logger } from '../utils/logger'
import Tool from '../utils/tools'

var router = new Router();
router.post("/requests", async (ctx) => {
    let recapchaService = new RecapchaService(ctx.config)
    let score = await recapchaService.verifyRecapcha(ctx.request.body.token)
    let domain = ctx.request.body.annex.domain
    let signer = ctx.request.body.annex.signer
    let timestamp = parseFloat(ctx.request.body.annex.timestamp)
    let signature = ctx.request.body.signature
    let purpose = ctx.request.body.purpose
    let type = ctx.request.body.payload.type
    let content = ctx.request.body.payload.content
    let cert = new Cert(domain, timestamp, signer, signature, purpose, type, content)
    Validator.validateTimestamp(timestamp, ctx.config.certificateExpiration)
    Validator.validateCertificate(cert)
    let addr = Validator.validateAddress(signer)
    let ip = ctx.request.ip;
    let service = new TransactionService(ctx.db, ctx.config)
    let certHash = blake2b256(Certificate.encode(cert)).toString('hex')
    await service.certHashApproved(certHash)
    await service.balanceApproved()
    let currentTimestamp = Tool.getLocalTime(new Date(), ctx.config.timezone)
    let latestSchedule = await service.scheduleApproved(currentTimestamp)
    await service.addressApproved(addr, latestSchedule)
    await service.ipApproved(ip, latestSchedule)
    let tx = await service.buildTx(addr, latestSchedule)
    await service.txApproved(tx.id)
    await service.insertTx(tx.id, addr, ip, currentTimestamp, certHash, latestSchedule)
    await service.send(tx)
    ctx.body = {
        id: tx.id.toString(),
        msg: `Congratulations! 

You have now successfully claimed ${latestSchedule.vet} VET and ${latestSchedule.thor} VTHO to ${signer}
        `
    };
    logger.info(`IP=${ip} Address=${signer} Score=${score}`)
});

export default router;