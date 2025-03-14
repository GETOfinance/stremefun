const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {
    log,
    info,
    debug,
    warn,
    error,
    write,
} = require("firebase-functions/logger");

const ethers = require("ethers");
const {PubSub} = require("@google-cloud/pubsub");
const pubsub = new PubSub();

const StremeJSON = require("./abis/Streme.json");
const StakingFactoryJSON = require("./abis/StakingFactory.json");
const StakedTokenJSON = require("./abis/StakedToken.json");
const LPFactoryJSON = require("./abis/LPFactory.json");
const LpLockerJSON = require("./abis/LpLockerv2.json");
const SuperTokenFactoryJSON = require("./abis/SuperTokenFactory.json");
const UniswapV3FactoryJSON = require("./abis/UniswapV3Factory.json");

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};

module.exports = {

    "chain": "aurora_testnet",

    "chainId": () => {
        const util = module.exports;
        if (util.chain == "baseSepolia") {
            return 84532;
        } else if (util.chain == "base") {
            return 8453;
        } else if (util.chain == "aurora_testnet") {
            return 1313161555;
        }
    }, // chainId

    "season": 1,

    "getAddresses": () => {
        const util = module.exports;
        var addr = {};
        if (util.chain == "baseSepolia") {
            addr.streme = process.env.STREME_BASESEP;
            addr.stakingFactory = process.env.STREME_BASESEP_STAKING_FACTORY;
            addr.postDeployFactory = process.env.STREME_BASESEP_STAKING_FACTORY;
            addr.lpFactory = process.env.STREME_BASESEP_LP_FACTORY;
            addr.superTokenFactory = process.env.STREME_BASESEP_SUPER_TOKEN_FACTORY;
            addr.tokenFactory = process.env.STREME_BASESEP_SUPER_TOKEN_FACTORY;
            addr.lpLocker = process.env.STREME_BASESEP_LIQUIDITY_LOCKER;
            addr.uniswapV3Factory = process.env.BASESEP_UNISWAP_V3_FACTORY;
            addr.weth = process.env.BASESEP_WETH;
            addr.gdaForwarder = process.env.BASESEP_GDA_FORWARDER;
        } else if (util.chain == "base") {
            addr.streme = process.env.STREME;
            addr.stakingFactory = process.env.STREME_STAKING_FACTORY;
            addr.postDeployFactory = process.env.STREME_STAKING_FACTORY;
            addr.lpFactory = process.env.STREME_LP_FACTORY;
            addr.superTokenFactory = process.env.STREME_SUPER_TOKEN_FACTORY;
            addr.tokenFactory = process.env.STREME_SUPER_TOKEN_FACTORY;
            addr.lpLocker = process.env.STREME_LIQUIDITY_LOCKER;
            addr.uniswapV3Factory = process.env.UNISWAP_V3_FACTORY;
            addr.weth = process.env.WETH;
            addr.gdaForwarder = process.env.GDA_FORWARDER;
        } else if (util.chain == "aurora_testnet") {
            // Aurora Testnet contract addresses - placeholder values to be updated with actual deployments
            addr.streme = "0x1234567890123456789012345678901234567890";
            addr.stakingFactory = "0x1234567890123456789012345678901234567890";
            addr.postDeployFactory = "0x1234567890123456789012345678901234567890";
            addr.lpFactory = "0x1234567890123456789012345678901234567890";
            addr.superTokenFactory = "0x1234567890123456789012345678901234567890";
            addr.tokenFactory = "0x1234567890123456789012345678901234567890";
            addr.lpLocker = "0x1234567890123456789012345678901234567890";
            addr.uniswapV3Factory = "0x1234567890123456789012345678901234567890";
            addr.weth = "0x1234567890123456789012345678901234567890"; // ETH on Aurora
            addr.gdaForwarder = "0x1234567890123456789012345678901234567890";
        }
        return addr;
    }, // getAddresses

    "getProvider": () => {
        const util = module.exports;
        if (util.chain == "baseSepolia") {
            return new ethers.providers.JsonRpcProvider(process.env.API_URL_BASESEPOLIA);
        } else if (util.chain == "base") {
            return new ethers.providers.JsonRpcProvider(process.env.API_URL_BASE);
        } else if (util.chain == "aurora_testnet") {
            return new ethers.providers.JsonRpcProvider("https://testnet.aurora.dev");
        }
    }, // getProvider

    "autonomeChat": async (cast) => {
        const apiUrl = "https://autonome.alt.technology/streme-aelyud/chat";
        const data = {
            "message": `You are @streme and your primary skill is deploying Super Tokens on request. Super Tokens are ERC20 tokens that can be streamed in real-time by the second, powered by Superfluid. When users request creation of a token, you should extract a name and a symbol from the request, and respond that you will deploy the token on the Aurora Testnet network. The tokens you create are sometimes referred to as Streme Coins. Respond only with a JSON object with elements for name, symbol, and response. Do NOT preface the JSON object with any commentary. Your tone is funny and light-hearted. You strive to please but also to make people laugh. You only create tokens when there is a clear request to do so. When making this assessment, you should ONLY consider the text part of the user's message. If you do not detect a request to create or deploy a token, then return null for title and description, and provide a response explaining. If someone asks you about the kinds of tokens you can create, you can tell them: 1) they are native Super Tokens powered by @superfluid, 2) they have built-in staking with streaming rewards, 3) they are immediately tradeable via a Uniswap v3 pool, 4) 40% of trading fees goes to the creator, and 5) you need a Neynar Score of  0.7 or higher to deploy (threshold may change in future\n\n<example>\nInput: @streme please create a token called yellow flowers with a symbol of YELLOW.\nOutput: name = \"Yellow Flowers\", symbol = \"YELLOW\", response: \"Sure I will create a token called Yellow Flowers on the Aurora Testnet network with the symbol YELLOW\n</example>\n<example>\nInput: @streme what type of tokens can you create?\nOutput: I can only create native Super Tokens on the Aurora Testnet network, with real-time streaming powered by @superfluid. The tokens have built-in staking with 20% of the supply being streamed as staking rewards for the first 365 days. The other 80% of supply is locked in a Uniswap v3 pool, with 40% of trading fees going to the deployer.\n</example> The message sender's name is ${cast.author.display_name} with username @${cast.author.username}. Please reply to their message. Only 5% of the time, you mention the message sender in your response. <message>${cast.text}</message>`
        };
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": "Basic " + process.env.AUTONOME_BASIC_AUTH,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        const json = await response.json();
        console.log("autonomeChat", json);
        // parse the response as JSON:
        // remove /n line breaks from the response:
        var aiResponse = json.response[0].replace(/\n/g, "");
        // check that claudeResponse begins with { and ends with }:
        if (aiResponse.startsWith("{") && aiResponse.endsWith("}")) {
            // no-op
        } else if (aiResponse.includes("{") && aiResponse.includes("}")) {
            // extract the JSON object from the text response:
            const start = aiResponse.indexOf("{");
            const end = aiResponse.lastIndexOf("}");
            aiResponse = aiResponse.substring(start, end + 1);
        } else {
            resolve({
                "name": null,
                "symbol": null,
                "response": aiResponse
            });
        } // if 
        const responseJson = JSON.parse(aiResponse);
        console.log("responseJson", responseJson);
        return responseJson;
    }, // autonomeChat

    "getImageFromCast": async (embeds) => {
        const util = module.exports;
        return new Promise(async function(resolve, reject) {
            var imageEmbed;
            var contentType;
            var foundImage = false;
            for (var i = 0; i < embeds.length; i++) {
                const embed = embeds[i];
                if ("url" in embed) {
                    const url = embed.url;
                    // confirm this is an image
                    if ("metadata" in embed && "content_type" in embed.metadata && embed.metadata.content_type.includes("image")) {
                        contentType = embed.metadata.content_type;
                        foundImage = true;
                        imageEmbed = embed;
                    } else if ("metadata" in embed && "_status" in embed.metadata && embed.metadata._status == "PENDING") {
                        // use fetch to to send HEAD request to url to get content-type:
                        const response = await fetch(url, {method: 'HEAD'});
                        const headers = response.headers;
                        const contentType = headers.get('content-type');
                        if (contentType && contentType.includes("image")) {
                            foundImage = true;
                            imageEmbed = embed;
                        }
                    } // if image
                } // if url in embed
                // break loop if image found
                if (foundImage) {
                    break;
                }
            } // for i (embeds)
            if (!foundImage) {
                return resolve("");
            } else {
                return resolve(imageEmbed.url);
            }
        }); // return new Promise
    }, // getImageFromCast

    "deployToken": async (name, symbol, deployer, cast, minter) => {
        const util = module.exports;
        const addr = util.getAddresses();
        const provider = util.getProvider();
        //const keys = util.getKeys();
        //var random = Math.floor(Math.random() * keys.length);
        //if (minter) {
        //    random = minter;
        //}
        const key = minter;
        const signer = new ethers.Wallet(key, provider);
        const streme = new ethers.Contract(addr.streme, StremeJSON.abi, signer);
        const poolConfig = {
            "tick": -230400,
            "pairedToken": addr.weth,
            "devBuyFee": 10000
        };
        const tokenConfig = {
            "_name": name,
            "_symbol": symbol,
            "_supply": ethers.utils.parseEther("100000000000"), // 100 billion
            "_fee": 10000,
            "_salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "_deployer": deployer,
            "_fid": cast.author.fid,
            "_image": await util.getImageFromCast(cast.embeds),
            "_castHash": cast.hash,
            "_poolConfig": poolConfig
        };
        var salt, tokenAddress;
        console.log(tokenConfig["_symbol"], tokenConfig["_deployer"], addr.tokenFactory, poolConfig.pairedToken);
        const result = await streme.generateSalt(tokenConfig["_symbol"], tokenConfig["_deployer"], addr.tokenFactory, poolConfig.pairedToken);
        salt = result[0];
        tokenAddress = result[1];
        tokenAddress = tokenAddress.toLowerCase();
        console.log("Salt: ", salt);
        tokenConfig["_salt"] = salt;

        var pending = true;
        var retries = 0;
        var gasOptions = {};
        var tx;
        while (pending) {
            try {

                if (util.chain == "base") {
                    // get Base gas prices from gasstation
                    try {
                        console.log("fetching gas from gasstation");
                        var resGas = await fetch('https://frm.lol/api/gas/base');
                        var gas = await resGas.json();
                        if (gas) {
                            gasOptions = gas;
                            console.log("from /api/gas/base", gas);
                        }
                    } catch (e) {
                        console.log(e);
                    } // try
                } // if chain
                console.log(addr.tokenFactory, addr.postDeployFactory, addr.lpFactory, ethers.constants.AddressZero, tokenConfig, gasOptions);
                tx = await (await streme.deployToken(addr.tokenFactory, addr.postDeployFactory, addr.lpFactory, ethers.constants.AddressZero, tokenConfig, gasOptions)).wait();
                console.log("Transaction", tx);
                pending = false;

            } catch (e) {

                const errorCode = e.code;
                console.log(errorCode);
                if (errorCode && (errorCode == "REPLACEMENT_UNDERPRICED" || errorCode == "NONCE_EXPIRED")) {
                    pending = true;
                    retries++;
                    console.log("NONCE issue. Retry count " + retries);
                    // random number between 1000 and 5000:
                    const delay = Math.floor(Math.random() * 4000) + 1000;
                    console.log("delay", delay);
                    await sleep(delay);
                } else {
                    console.log("exiting pending loop: error:", e);
                    pending = false;
                }

            } // catch
        } // while pending

        if (!tx) {
            console.log("tx not found");
            return false;
        }
        const txnHash = tx.transactionHash;
        const blockNumber = tx.blockNumber;
        console.log("Token Address: ", tokenAddress);
        // add to firestore:
        const data = 
        {
            "id": 69,
            "timestamp": FieldValue.serverTimestamp(),
            "block_number": blockNumber,
            "tx_hash": txnHash,
            "contract_address": tokenAddress,
            "requestor_fid": cast.author.fid,
            "name": name,
            "symbol": symbol,
            "img_url": tokenConfig["_image"],
            "pool_address": "",
            "cast_hash": cast.hash,
            "type": "streme_s" + util.season,
            "pair": "WETH",
            "presale_id": null,
            "chain_id": util.chainId(),
            "metadata": null,
            "tokenFactory": addr.tokenFactory.toLowerCase(),
            "postDeployHook": addr.stakingFactory.toLowerCase(),
            "liquidityFactory": addr.lpFactory.toLowerCase(),
            "postLpHook": ethers.constants.AddressZero,
            "poolConfig": poolConfig,
        };
        // add channel if it exists
        if ("channel" in cast && cast.channel && "id" in cast.channel) {
            data.channel = cast.channel.id;
        }
        const db = getFirestore();
        const tokensRef = db.collection("tokens").doc(tokenAddress);
        const tokenDoc = await tokensRef.set(data);
        return tokenAddress;
    }, // deployToken

    "getUniswapV3Pool": async (token) => {
        return new Promise(async (resolve, reject) => {
            const tokenA = token.contract_address;
            const tokenB = token.poolConfig.pairedToken ? token.poolConfig.pairedToken : process.env.WETH;
            const fee = token.poolConfig.devBuyFee ? token.poolConfig.devBuyFee : 10000;
            const util = module.exports;
            const addr = util.getAddresses();
            const provider = util.getProvider();
            const abi = [ "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)" ];
            const uniswapV3Factory = new ethers.Contract(addr.uniswapV3Factory, abi, provider);
            const poolAddress = await uniswapV3Factory.getPool(tokenA, tokenB, fee);
            resolve(poolAddress.toLowerCase());
        }); // return new Promise
    }, // getUniswapV3Pool

    "getStakingData": async (token) => {
        return new Promise(async (resolve, reject) => {
            const util = module.exports;
            const addr = util.getAddresses();
            const provider = util.getProvider();
            const stakingFactory = new ethers.Contract(addr.stakingFactory, StakingFactoryJSON.abi, provider);
            // get data from StakedTokenCreated event
            // TODO: update contract to add indexed to depositToken
            const filter = stakingFactory.filters.StakedTokenCreated();
            const logs = await stakingFactory.queryFilter(filter, token.block_number, token.block_number);
            //const logs = await provider.queryFilter(filter, {fromBlock: token.block_number, toBlock: token.block_number});
            console.log("logs", logs);
            var stakeToken = '';
            var pool = '';
            for (var i = 0; i < logs.length; i++) {
                const eventLog = logs[i];
                const parsedLog = stakingFactory.interface.parseLog(eventLog);
                console.log("parsedLog", parsedLog);
                log("parsedLog.args.stakeToken", parsedLog.args.stakeToken);
                if (parsedLog.args.depositToken.toLowerCase() == token.contract_address.toLowerCase()) {
                    stakeToken = parsedLog.args.stakeToken;
                    pool = parsedLog.args.pool;
                }
            }
            resolve({"stakeToken": stakeToken.toLowerCase(), "pool": pool.toLowerCase()});
        }); // return new Promise
    }, // getStakingData

    "getUniswapV3PoolFromEvent": async (token) => {
        return new Promise(async (resolve, reject) => {
            const util = module.exports;
            const addr = util.getAddresses();
            const provider = util.getProvider();
            const uniswapV3Factory = new ethers.Contract(addr.uniswapV3Factory, UniswapV3FactoryJSON.abi, provider);
            const filter = uniswapV3Factory.filters.PoolCreated();
            const logs = await uniswapV3Factory.queryFilter(filter, token.block_number, token.block_number);
            console.log("logs", logs);
            var pool = '';
            for (var i = 0; i < logs.length; i++) {
                const eventLog = logs[i];
                const parsedLog = uniswapV3Factory.interface.parseLog(eventLog);
                console.log("parsedLog", parsedLog);
                if (parsedLog.args.token0.toLowerCase() == token.contract_address.toLowerCase() || parsedLog.args.token1.toLowerCase() == token.contract_address.toLowerCase()) {
                    pool = parsedLog.args.pool;
                }
            }
            resolve(pool.toLowerCase());
        }); // return new Promise
    }, // getUniswapV3PoolFromEvent

    "staking": async (token) => {
        return new Promise(async (resolve, reject) => {
            const util = module.exports;
            const addr = util.getAddresses();
            const provider = util.getProvider();

            // before staking, user must approve the staking contract to spend their streme coins
            const superAbi = [ "function approve(address spender, uint256 amount) external returns (bool)" ];
            const superToken = new ethers.Contract(token.contract_address, superAbi, provider);
            // TODO: do approval

            // user calls stake or unstake on the staking contract -- stake requires approval first
            // and most be holding amount of streme coins
            // unstake does not require approval
            // `to` in both cases should usually be the msg.sender
            const stakingAbi = [
                "function stake(address to, uint256 amount) external",
                "function unstake(address to, uint256 amount) external",
            ]
            const stakedToken = new ethers.Contract(token.staking_address, stakingAbi, provider);
            // TODO: do stake or unstake

            // user can now connect to pool to see tokens in wallet
            const gdaABI = [
                "function isMemberConnected(address pool, address member) external view returns (bool)",
                "function connectPool(address pool, bytes userData) external returns (bool)"
            ];
            const gdaContract = new ethers.Contract(addr.gdaForwarder, gdaABI, provider);
            // use isMemberConnected to check if user is already connected
            // pool == token.staking_pool
            // member == user address
            const connected = await gdaContract.isMemberConnected(token.staking_pool, userAddress);
            if (!connected) {
                // connectPool
                // pool == token.staking_pool
                // userData == bytes -- can be empty "0x"
                const userData = "0x";
                const connected = await gdaContract.connectPool(token.staking_pool, userData);
            }
            resolve(connected);
        }); // return new Promise
    }, // staking


    "getTokenStats": async (tokenAddress) => {
        return new Promise(async (resolve, reject) => {
            const util = module.exports;
            var stats = {};
            const provider = util.getProvider();
            const db = getFirestore();
            const tokensRef = db.collection("tokens").doc(tokenAddress.toLowerCase());
            const tokenDoc = await tokensRef.get();
            if (!tokenDoc.exists) {
                return resolve(null);
            }
            const token = tokenDoc.data();
            const stakeToken = new ethers.Contract(token["staking_address"], StakedTokenJSON.abi, provider);
            const superAbi = [ "function balanceOf(address account) external view returns (uint256)" ];
            const superToken = new ethers.Contract(tokenAddress, superAbi, provider);
            stats.staked = await stakeToken.totalSupply();
            stats.staked = parseFloat(ethers.utils.formatEther(stats.staked));
            stats.flowRate = 634.1958449; // 1 per second (x 10^18)
            stats.totalUnits = stats.staked;
            stats.apr = stats.flowRate * 31536000 / stats.totalUnits * 100;
            stats.holdings = {
                "lpPool": parseFloat(ethers.utils.formatEther(await superToken.balanceOf(token["pool_address"]))),
                "staked": parseFloat(ethers.utils.formatEther(await superToken.balanceOf(token["staking_address"]))),
                "rewards": parseFloat(ethers.utils.formatEther(await superToken.balanceOf(token.postDeployHook)))
            };
            stats.holdings.others = 100000000000 - stats.holdings.lpPool - stats.holdings.staked - stats.holdings.rewards;
            return resolve(stats);
        }); // return new Promise
    }, // getTokenStats

    "getTokenStatsForUser": async (tokenAddress, userAddress) => {
        return new Promise(async (resolve, reject) => {
            const util = module.exports;
            var stats = {};
            const provider = util.getProvider();
            const addr = util.getAddresses();
            const db = getFirestore();
            const tokensRef = db.collection("tokens").doc(tokenAddress.toLowerCase());
            const tokenDoc = await tokensRef.get();
            if (!tokenDoc.exists) {
                return resolve(null);
            }
            const token = tokenDoc.data();
            const stakeToken = new ethers.Contract(token["staking_address"], StakedTokenJSON.abi, provider);
            const superAbi = [ 
                "function balanceOf(address account) external view returns (uint256)",
                "function allowance(address owner, address spender) external view returns (uint256)"
            ];
            const superToken = new ethers.Contract(tokenAddress, superAbi, provider);
            const poolAddress = token["staking_pool"];
            const memberAddress = userAddress;
            const abi = [
                "function getUnits(address memberAddress) external view returns (uint128)",
                "function getTotalUnits() external view returns (uint128)",
                "function getTotalFlowRate() external view returns (int96)",
                "function getMemberFlowRate(address memberAddress) external view returns (int96)",
                "function getClaimableNow(address memberAddr) external view returns (int256 claimableBalance, uint256 timestamp)",
                "function getTotalAmountReceivedByMember(address memberAddr) external view  returns (uint256)",
                "function claimAll(address memberAddr) external returns (bool)"
            ];
            const contract = new ethers.Contract(poolAddress, abi, provider);
            var units = await contract.getUnits(memberAddress);
            var received = await contract.getTotalAmountReceivedByMember(memberAddress);
            received = received / 1e18;
            received = received.toFixed(2);
            var flowRate = await contract.getMemberFlowRate(memberAddress);
            flowRate = flowRate / 1e18;
            flowRate = flowRate.toFixed(2);
            var claimable = await contract.getClaimableNow(memberAddress);
            claimable = claimable[0] / 1e18;
            claimable = claimable.toFixed(2);
            // GDA
            const gdaABI = [
                "function isMemberConnected(address pool, address member) external view returns (bool)",
                "function connectPool(address pool, bytes userData) external returns (bool)"
            ];
            const gdaContract = new ethers.Contract(addr.gdaForwarder, gdaABI, provider);
            var connected = await gdaContract.isMemberConnected(poolAddress, memberAddress);
    
            stats.unstaked = parseFloat(ethers.utils.formatEther(await superToken.balanceOf(userAddress)));
            stats.staked = parseFloat(ethers.utils.formatEther(await stakeToken.balanceOf(userAddress)));
            stats.stakingAllowanceWei = (await superToken.allowance(userAddress, token["staking_address"])).toString();
            stats.allowance = ethers.utils.formatEther(await superToken.allowance(userAddress, token["staking_address"])).toString();
            stats.flowRate = flowRate; // per second, whole units
            stats.memberUnits = parseFloat(units);
            stats.totalUnits = parseFloat(await contract.getTotalUnits());
            stats.claimable = claimable;
            stats.received = received;
            stats.connected = connected;
            stats.apr = stats.flowRate * 31536000 / stats.memberUnits * 100;
            return resolve(stats);
        }); // return new Promise
    }, // getTokenStatsForUser


    "sendCast": async function(cast) {
        const util = module.exports;
        return new Promise(async function(resolve, reject) {
            var response = await fetch(`https://api.neynar.com/v2/farcaster/cast`, { 
                method: 'POST', 
                headers: {
                    'Accept': 'application/json', 
                    'Content-Type': 'application/json',
                    'Api_key': process.env.NEYNAR_API_KEY
                },
                body: JSON.stringify(cast)
            });
            var castResult = await response.json();
            console.log("neynar POST cast", JSON.stringify(castResult));
            return resolve(castResult);
        }); // return new Promise
    }, // sendCast

    "verifiedAddress": async function(user) {
        const util = module.exports;
        return new Promise(async function(resolve, reject) {
            var address;
            if (user) {
                // get last verified eth address
                if ("verified_addresses" in user) {
                    if ("eth_addresses" in user.verified_addresses) {
                        address = user.verified_addresses.eth_addresses[user.verified_addresses.eth_addresses.length-1];
                    } // if eth_addresses
                } // if verified_addresses
            } // if user
            //console.log("address", address);
            return resolve(address);
        }); // return new Promise
    }, // verifiedAddress

    "processMention": async function (cast, minter) {
        console.log("processMention started", cast.hash);
        const util = module.exports;
        const db = getFirestore();
        return new Promise(async function(resolve, reject) {
            const sendCastEnabled = true;
            // check if user qualifies. neynar score?
            var allowed = false;
            const allowList = [
                parseInt(process.env.FREME_FID)
            ];
            console.log("allowList", allowList);
            // is cast.author.fid in allowList?
            if (allowList.includes(cast.author.fid)) {
                allowed = true;
                console.log("allowed from allowList", cast.author.fid);
            }
            if ("allowed" in cast && cast.allowed) {
                allowed = true;
            }
            if (!allowed) {
                const useNeynar = false;
                if (useNeynar) {
                    const minScore = 0.7;
                    if ("experimental" in cast.author && "neynar_user_score" in cast.author.experimental && cast.author.experimental.neynar_user_score < minScore) {
                        // respond with error that user does not qualify
                        if (sendCastEnabled) {
                            await util.sendCast({
                                "parent": cast.hash,
                                "text": `Sorry, you do not qualify to deploy Streme coins. Your Neynar score of ${cast.author.experimental.neynar_user_score} is too low.`,
                                "signer_uuid": process.env.STREME_UUID,
                            });
                        }
                        //return res.json({"result": "error", "response": "User does not qualify"});
                        console.log(`user does not qualify, username: ${cast.author.username}, neynar_user_score: ${cast.author.experimental.neynar_user_score}`);
                        return resolve({"status": "error", "reason": "User does not qualify due to neynar_user_score"});
                    } // if minScore
                } else {
                    // respond with error that user does not qualify
                    if (sendCastEnabled) {
                        await util.sendCast({
                            "parent": cast.hash,
                            "text": `Sorry, ur not on the list. You are too early. If you are a judge or sponsor for the Agentic Ethereum Hackathon by @ETHGlobal, please contact @markcarey to be added to the allow list.`,
                            "signer_uuid": process.env.STREME_UUID,
                        });
                    }
                    //return res.json({"result": "error", "response": "User does not qualify"});
                    console.log("user does not qualify");
                    return resolve({"status": "error", "reason": "User does not qualify"});
                }
            } // if !allowed
        
            const banList = [
                6969669, // nobody
            ];
            // is cast.author.fid in banList?
            if (banList.includes(cast.author.fid)) {
                // respond with error that user is banned
                if (sendCastEnabled) {
                    await util.sendCast({
                        "parent": cast.hash,
                        "text": `Seems like somehow you got banned https://y.yarn.co/d9b730de-cb98-4aad-b955-c813a2f7ee5e_text.gif`,
                        "signer_uuid": process.env.STEME_UUID,
                    });
                }
                return resolve({"status": "error", "reason": "User is banned"});
            }
        
            // check if this cast has already been processed
            // query for doc in tokens collection where cast_hash == cast.hash:
            const query = db.collection("tokens").where("cast_hash", "==", cast.hash);
            const docRef = await query.get();
            // are there any results?
            if (!docRef.empty) {
                console.log("docRef not empty, mention already processed");
                return resolve({"status": "error", "reason": "Token already created"});
            } else {
                console.log("docRef empty, mention not processed");
            }
                    
            // send cast to Autonome for processing
            const ai = await util.autonomeChat(cast);
        
            if (!ai.name || !ai.symbol) {
                // respond with error that token cannot be created
                if (sendCastEnabled) {
                        await util.sendCast({
                            "parent": cast.hash,
                            "text": ai.response,
                            "signer_uuid": process.env.FREME_UUID,
                    });
                }
                //return res.json({"result": "error", "response": ai.response});
                console.log("ai.name not found");
                return resolve({"status": "error", "reason": "token creation intent not found"});
            }
        
            var creatorAddress = await util.verifiedAddress(cast.author);
            if (!creatorAddress) {
                // respond with error that NFT cannot be created
                if (sendCastEnabled) {
                    await util.sendCast({
                        "parent": cast.hash,
                        "text": `Sorry, you must verify your Ethereum address to launch Streme coins.`,
                        "signer_uuid": process.env.FREME_UUID,
                    });
                }
                console.log("creatorAddress not found");
                return resolve({"status": "error", "reason": "creatorAddress not found"});
            }
        
            
            // deploy token
            const doDeploy = true;
            var tokenAddress;
            if (doDeploy) {
                tokenAddress = await util.deployToken(ai.name, ai.symbol, creatorAddress, cast, minter);
                console.log("deployed", tokenAddress);
                if (!tokenAddress) {
                    // respond with error that token cannot be created
                    if (sendCastEnabled) {
                        await util.sendCast({
                            "parent": cast.hash,
                            "text": `Sorry, there was an error creating your token.`,
                            "signer_uuid": process.env.STREME_UUID,
                        });
                    } // if sendCastEnabled
                    console.log("deploy not successful");
                    return resolve({"status": "error", "reason": "deploy txn failed"});
                } // if !minted
                await util.logDeploy({
                    "token": tokenAddress,  
                    "creator": cast.author.fid,
                });
            } // if doMint
            if (sendCastEnabled && tokenAddress) {
                // add frame embed to this cast
                const frameURL = `https://api.streme.fun/token/${tokenAddress}/v1frame`;
                await util.sendCast({
                    "parent": cast.hash,
                    "text": ai.response + `\n\nHere's your Streme coin:`,
                    "signer_uuid": process.env.STREME_UUID,
                    "embeds": [
                        {
                            "url": frameURL,
                        }
                    ]
                });
            } // if sendCastEnabled
            return resolve({"status": "processed"});
        }); // return promise
    }, // processMention

    "logDeploy": async function(data) {
        return new Promise(async function(resolve, reject) {
            const db = getFirestore();
            // TODO: log stuff?
            return resolve(true);
        }); // return new Promise
    }, // logDeploy

    "getMinterKeys": function() {
        const minterKeys = [
            process.env.MINTER_1
        ];
        return minterKeys;
    }, // getMinterKeys



}; // module.exports
