import { Sequelize } from 'sequelize-typescript';
import Record from '../sequelize-models/record.models';
import { Address, Transaction, BigInt, Secp256k1, Bytes32 } from 'thor-model-kit';
import { abi } from 'thor-devkit'
import ThorAPI from '../api/thor-api';
import Config from '../utils/config';
import { logger } from '../utils/logger'
import { HttpError, ErrorCode, HttpStatusCode } from '../utils/httperror';
import { BigNumber } from 'bignumber.js';
import { randomBytes } from 'crypto'
import { Op, fn, where } from 'sequelize';


export default class TransactionService {
    private thorAPI: ThorAPI
    private config: Config
    constructor(config: Config) {
        this.thorAPI = new ThorAPI(config.networkAPIAddr)
        this.config = config
    }

    async certHashApproved(certHash: string) {
        let count = await Record.count({
            where: {
                certhash: certHash
            }
        })
        if (count > 0) {
            logger.error("this certificate has already been used", "cert hash", certHash)
            throw new HttpError("this certificate has already been used", ErrorCode.Certificate_Expired, HttpStatusCode.Forbidden)
        }
    }

    async balanceApproved() {
        let acc = await this.thorAPI.getAccount(this.config.addr)
        let balance = new BigNumber(acc.balance)
        let eng = new BigNumber(acc.eng)
        if (balance.isLessThan(this.config.vetLimit)) {
            logger.error(`insufficient vet`, balance, this.config.vetLimit)
            throw new HttpError(`You are too late. All of the rewards have now been claimed for this session.`, ErrorCode.Insufficient_Vet, HttpStatusCode.Forbidden)
        }
        if (eng.isLessThan(this.config.thorLimit)) {
            logger.error(`insufficient energy`, eng, this.config.thorLimit)
            throw new HttpError(`You are too late. All of the rewards have now been claimed for this session.`, ErrorCode.Insufficient_Thor, HttpStatusCode.Forbidden)
        }
    }

    async addressApproved(addr: Address) {
        let count = await Record.count({
            where: {
                [Op.and]: [
                    where(fn('FROM_UNIXTIME', Sequelize.col('timestamp'), '%Y-%m-%d'), '=', fn('FROM_UNIXTIME', Date.now() / 1000, '%Y-%m-%d')),
                    {
                        address: addr.toString()
                    }
                ]
            }
        })
        if (count >= this.config.addrTimes) {
            logger.error(`rateLimit Exceed, one address can only send one requests in current schedule`, "count:" + count)
            throw new HttpError(`You have already claimed rewards for this session. Please try again at next session.`, ErrorCode.Address_RateLimit_Exceeded, HttpStatusCode.Forbidden)
        }

    }

    async ipApproved(ip: string) {
        let count = await Record.count({
            where: {
                [Op.and]: [
                    where(fn('FROM_UNIXTIME', Sequelize.col('timestamp'), '%Y-%m-%d'), '=', fn('FROM_UNIXTIME', Date.now() / 1000, '%Y-%m-%d')), {
                        ip: ip
                    }
                ]
            }
        })
        if (count >= this.config.ipTimes) {
            logger.error(`rateLimit Exceed, one ip address can only send one requests in current schedule`, "count:" + count)
            throw new HttpError(`You have already claimed rewards for this session. Please try again at next session.`, ErrorCode.IP_RateLimit_Exceeded, HttpStatusCode.Forbidden)
        }
    }

    async txApproved(txid: Bytes32) {
        let count = await Record.count({
            where: {
                txid: txid.toString()
            }
        })
        if (count > 0) {
            logger.error("transaction is pending")
            throw new HttpError("transaction is pending", ErrorCode.Exist_Transaction, HttpStatusCode.Forbidden)
        }
    }

    async insertTx(txid: Bytes32, addr: Address, ip: string, certHash: string, vet: BigNumber, thor: BigNumber) {
        await Record.create({
            txid: txid.toString(),
            address: addr.toString(),
            ip: ip,
            vet: vet.toString(10),
            thor: thor.toString(10),
            timestamp: new Date().getTime() / 1000,
            certhash: certHash
        })
    }

    async buildTx(addr: Address, vet: BigNumber, thor: BigNumber) {
        let coder = new abi.Function({ "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" })
        let data = coder.encode(addr.toString(), thor)
        let clauses = [{
            to: addr,
            value: BigInt.from(vet),
            data: Buffer.alloc(0)
        }, {
            to: Address.fromHex('0x0000000000000000000000000000456e65726779'),
            value: BigInt.from(0),
            data: Buffer.from(data.slice(2), "hex")
        }]
        let bestBlock = await this.thorAPI.bestBlock()
        let nonce = '0x' + randomBytes(8).toString('hex')
        let body: Transaction.Body = {
            chainTag: this.config.chainTag,
            blockRef: Buffer.from(bestBlock.id.slice(2, 18), "hex"),
            expiration: 32,
            clauses: clauses,
            gasPriceCoef: 255,
            gas: BigInt.from(100000),
            dependsOn: null,
            nonce: BigInt.from(nonce),
            reserved: []
        }
        let tx = new Transaction(body)
        tx.signature = Secp256k1.sign(tx.signingHash, Bytes32.fromHex(this.config.privateKey))
        return tx
    }
    async send(tx: Transaction) {
        let raw = tx.encode()
        await this.thorAPI.sendTx(raw)
    }
}
