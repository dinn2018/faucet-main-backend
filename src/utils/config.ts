import * as fs from "fs";
import { BigNumber } from 'bignumber.js'
import * as path from 'path';
import { logger } from '../utils/logger'
import { secp256k1, publicKeyToAddress } from "thor-devkit/dist/cry";
import { Address } from "thor-model-kit";

enum CHAIN_TAG {
    Solo = 0xa4,
    Test = 0x27,
    Main = 0x4a
}

export default class Config {
    privateKey: string
    addr: Address
    chainTag: CHAIN_TAG
    claimVet: BigNumber
    claimThor: BigNumber
    exploreVet: BigNumber
    exploreThor: BigNumber
    vetLimit: BigNumber
    thorLimit: BigNumber
    addrTimes: number
    ipTimes: number
    networkAPIAddr: string
    recapchaSecretKey: string
    recapchaMinScore: number
    certificateExpiration: number
    codeLen: number

    constructor() {
        let data = fs.readFileSync(path.join(__dirname, "../../config.json"), "utf-8")
        let opt = JSON.parse(data)
        if (!process.env.NODE_ENV || process.env.NODE_ENV == "dev") {
            this.privateKey = opt.privateKey
            this.chainTag = parseInt(opt.chainTag)
            this.recapchaSecretKey = '6LfUrJEUAAAAAGKo2R5juHEoHE0T27HM66At5KhU'
            this.networkAPIAddr = "https://sync-testnet.vechain.org"
        } else {
            this.privateKey = process.env.PRIV_KEY
            this.chainTag = parseInt(process.env.CHAIN_TAG)
            this.recapchaSecretKey = process.env.RECAPCHA_SECRET_KEY
            this.networkAPIAddr = "https://sync-mainnet.vechain.org"
        }
        if (this.chainTag != CHAIN_TAG.Solo && this.chainTag != CHAIN_TAG.Test && this.chainTag != CHAIN_TAG.Main) {
            throw new Error("chain tag: invalid chain tag " + this.chainTag)
        }
        let pubKey = secp256k1.derivePublicKey(Buffer.from(this.privateKey.slice(2), "hex"))
        this.addr = Address.fromHex('0x' + publicKeyToAddress(pubKey).toString("hex"))
        this.claimVet = new BigNumber(opt.claimVet).multipliedBy(1e18)
        this.claimThor = new BigNumber(opt.claimThor).multipliedBy(1e18)
        this.exploreVet = new BigNumber(opt.exploreVet).multipliedBy(1e18)
        this.exploreThor = new BigNumber(opt.exploreThor).multipliedBy(1e18)
        this.vetLimit = new BigNumber(opt.vetLimit).multipliedBy(1e18)
        this.thorLimit = new BigNumber(opt.thorLimit).multipliedBy(1e18)
        this.addrTimes = parseInt(opt.addrTimes)
        this.ipTimes = parseInt(opt.ipTimes)
        this.certificateExpiration = parseInt(opt.certificateExpiration) * 1000
        this.recapchaMinScore = parseFloat(opt.recapchaMinScore)
        logger.info(`
chainTag: ${this.chainTag}
addr: ${this.addr.toString()} 
networkAPIAddr:${this.networkAPIAddr} 
recapchaSecretKey: ${this.recapchaSecretKey} 
`)
        this.codeLen = parseInt(opt.codeLen)

    }

}

declare module 'koa' {
    interface BaseContext {
        config: Config;
    }
}