import {
  Bytes,
  Address,
  BigInt,
  BigDecimal,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  BridgedToken,
  BridgedTokenDayData,
  Burn,
  Lock,
  Manager,
  Mint,
  Token,
  TokenDayData,
  Unlock,
  User,
  Wallet,
  WalletDayData,
} from "../generated/schema";

export let ZERO = BigInt.fromI32(0);
export let ZERO_BD = ZERO.toBigDecimal();
export let ONE = BigInt.fromI32(1);
export let ETH_WEI = BigDecimal.fromString("1000000000000000000")

export function createToken(
  address: Address,
  network: string,
  name: string,
  symbol: string,
  decimals: BigInt
): Token {
  let token = new Token(address.toHexString());
  token.network = network;
  token.address = address;

  token.name = name;
  token.symbol = symbol;
  token.decimals = decimals;

  token.eventsCount = ZERO;
  token.locksCount = ZERO;
  token.unlocksCount = ZERO;
  token.totalLocked = ZERO_BD;
  token.volume = ZERO_BD;

  token.save();

  return token;
}

export function createBridgedToken(
  address: Address,
  network: string,
  name: string,
  symbol: string,
  decimals: BigInt
): BridgedToken {
  let token = new BridgedToken(address.toHexString());
  token.network = network;
  token.address = address;

  token.name = name;
  token.symbol = symbol;
  token.decimals = decimals;

  token.eventsCount = ZERO;
  token.mintsCount = ZERO;
  token.burnsCount = ZERO;
  token.totalLocked = ZERO_BD;
  token.volume = ZERO_BD;

  token.save();

  return token;
}

export function createManager(address: Address, wallet: Wallet): Manager {
  let manager = new Manager(address.toHexString());

  manager.wallet = wallet.id;
  manager.eventsCount = ZERO;

  manager.locksCount = ZERO;
  manager.unlocksCount = ZERO;

  manager.mintsCount = ZERO;
  manager.burnsCount = ZERO;

  manager.nftMintsCount = ZERO;
  manager.nftBurnsCount = ZERO;
  manager.save();

  return manager;
}

export function getWallet(address: Address): Wallet {
  let wallet = Wallet.load(address.toHexString());
  if (wallet === null) {
    wallet = new Wallet(address.toHexString());
    wallet.assetsCount = ZERO;
    wallet.usersCount = ZERO;
    wallet.eventsCount = ZERO;
    wallet.transactionsCount = ZERO;
    wallet.avgTransactionFee = ZERO_BD;
    wallet.totalTransactionFee = ZERO_BD;
    wallet.transactionsConfirmedCount = ZERO;
    wallet.transactionsExecutedCount = ZERO;
    wallet.save();
  }

  return wallet as Wallet;
}

export function getUser(
  address: Address,
  wallet: Wallet,
  event: ethereum.Event
): User {
  let user = User.load(address.toHexString());

  if (user === null) {
    user = new User(address.toHexString());
    user.eventsCount = ZERO;

    user.locksCount = ZERO;
    user.unlocksCount = ZERO;

    user.mintsCount = ZERO;
    user.burnsCount = ZERO;

    user.nftMintsCount = ZERO;
    user.nftBurnsCount = ZERO;

    user.save();

    wallet.usersCount = wallet.usersCount.plus(ONE);
    wallet.save();

    let walletDayData = getWalletDayData(wallet, event);
    walletDayData.usersCount = wallet.usersCount;
    walletDayData.newUsersCount = walletDayData.newUsersCount.plus(ONE);
    walletDayData.save();
  }

  return user as User;
}

interface ILockedParams {
  token: Address;
  sender: Address;
  amount: BigInt;
  recipient: Address;
}

interface ILocked extends ethereum.Event {
  params: ILockedParams;
}

interface IUnlockedParams {
  amount: BigInt;
  recipient: Address;
  receiptId: Bytes;
}

interface IUnlocked extends ethereum.Event {
  params: IUnlockedParams;
}

interface IMintedParams {
  amount: BigInt;
  recipient: Address;
  receiptId: Bytes;
}

interface IMinted extends ethereum.Event {
  params: IMintedParams;
}

interface IBurnedParams {
  token: Address;
  sender: Address;
  amount: BigInt;
  recipient: Address;
}

interface IBurned extends ethereum.Event {
  params: IBurnedParams;
}

export function getWalletDayData(
  wallet: Wallet,
  event: ethereum.Event
): WalletDayData {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let walletDayID = wallet.id
    .toString()
    .concat("-")
    .concat(dayID.toString());

  let walletDayData = WalletDayData.load(walletDayID);
  if (walletDayData === null) {
    walletDayData = new WalletDayData(walletDayID);
    walletDayData.date = dayStartTimestamp;
    walletDayData.wallet = wallet.id;

    walletDayData.eventsCount = ZERO;
    walletDayData.usersCount = wallet.usersCount;
    walletDayData.newUsersCount = ZERO;
    walletDayData.assetsCount = wallet.assetsCount;
    walletDayData.newAssetsCount = ZERO;
    walletDayData.transactionsCount = ZERO;
    walletDayData.totalTransactionFee = ZERO_BD;
    walletDayData.avgTransactionFee = ZERO_BD;

    walletDayData.save();
  }

  return walletDayData as WalletDayData;
}

function getBridgedTokenDayData(
  token: BridgedToken,
  event: ethereum.Event
): BridgedTokenDayData {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let tokenDayID = token.id
    .toString()
    .concat("-")
    .concat(dayID.toString());

  let tokenDayData = BridgedTokenDayData.load(tokenDayID);
  if (tokenDayData === null) {
    tokenDayData = new BridgedTokenDayData(tokenDayID);
    tokenDayData.date = dayStartTimestamp;
    tokenDayData.token = token.id;

    tokenDayData.volume = ZERO_BD;
    tokenDayData.eventsCount = ZERO;
    tokenDayData.mintsCount = ZERO;
    tokenDayData.burnsCount = ZERO;

    tokenDayData.totalLocked = token.totalLocked;
    tokenDayData.save();
  }

  return tokenDayData as BridgedTokenDayData;
}

export function createTokenMint<T extends IMinted>(
  token: BridgedToken,
  manager: Manager,
  event: T
): void {
  let wallet = getWallet(Address.fromString(manager.wallet));
  let user = getUser(event.params.recipient, wallet, event);
  let mint = new Mint(
    event.transaction.hash
      .toHexString()
      .concat("-")
      .concat(event.logIndex.toString())
  );
  mint.contract = event.address;
  mint.type = "MINT";
  mint.token = token.id;
  mint.manager = manager.id;
  mint.asset = token.id;
  mint.user = user.id;
  mint.amount = event.params.amount.toBigDecimal();
  mint.recipient = event.params.recipient;
  mint.receiptId = event.params.receiptId;
  mint.timestamp = event.block.timestamp;
  mint.blockNumber = event.block.number;
  mint.txIndex = event.transaction.index;
  mint.txHash = event.transaction.hash;
  mint.save();

  token.eventsCount = token.eventsCount.plus(ONE);
  token.mintsCount = token.mintsCount.plus(ONE);
  token.totalLocked = token.totalLocked.plus(mint.amount);
  token.volume = token.volume.plus(mint.amount);
  token.save();

  manager.eventsCount = manager.eventsCount.plus(ONE);
  manager.mintsCount = manager.mintsCount.plus(ONE);
  manager.save();

  user.eventsCount = user.eventsCount.plus(ONE);
  user.mintsCount = user.mintsCount.plus(ONE);
  user.save();

  wallet.eventsCount = wallet.eventsCount.plus(ONE);
  wallet.save();

  let dayData = getBridgedTokenDayData(token, event);
  dayData.volume = dayData.volume.plus(mint.amount);
  dayData.totalLocked = token.totalLocked;
  dayData.eventsCount = dayData.eventsCount.plus(ONE);
  dayData.mintsCount = dayData.mintsCount.plus(ONE);
  dayData.save();

  let walletDayData = getWalletDayData(wallet, event);
  walletDayData.eventsCount = walletDayData.eventsCount.plus(ONE);
  walletDayData.save();
}

export function createTokenBurn<T extends IBurned>(
  token: BridgedToken,
  manager: Manager,
  event: T
): void {
  let wallet = getWallet(Address.fromString(manager.wallet));

  let user = getUser(event.params.recipient, wallet, event);

  let burn = new Burn(
    event.transaction.hash
      .toHexString()
      .concat("-")
      .concat(event.logIndex.toString())
  );
  burn.contract = event.address;
  burn.type = "BURN";
  burn.asset = token.id;
  burn.token = token.id;
  burn.manager = manager.id;
  burn.user = user.id;
  burn.amount = event.params.amount.toBigDecimal();
  burn.recipient = event.params.recipient;
  burn.sender = event.params.sender;
  burn.timestamp = event.block.timestamp;
  burn.blockNumber = event.block.number;
  burn.txIndex = event.transaction.index;
  burn.txHash = event.transaction.hash;
  burn.txFee = event.transaction.gasPrice.times(event.transaction.gasUsed)
    .toBigDecimal().div(ETH_WEI);
  burn.save();

  token.eventsCount = token.eventsCount.plus(ONE);
  token.burnsCount = token.burnsCount.plus(ONE);
  token.totalLocked = token.totalLocked.minus(burn.amount);
  token.save();

  manager.eventsCount = manager.eventsCount.plus(ONE);
  manager.mintsCount = manager.mintsCount.plus(ONE);
  manager.save();

  user.eventsCount = user.eventsCount.plus(ONE);
  user.mintsCount = user.mintsCount.plus(ONE);
  user.save();

  wallet.eventsCount = wallet.eventsCount.plus(ONE);
  wallet.totalTransactionFee = wallet.totalTransactionFee.plus(burn.txFee);
  wallet.avgTransactionFee = wallet.totalTransactionFee.div(wallet.transactionsCount.toBigDecimal());
  wallet.save();

  let dayData = getBridgedTokenDayData(token, event);
  dayData.volume = dayData.volume.plus(burn.amount);
  dayData.totalLocked = token.totalLocked;
  dayData.eventsCount = dayData.eventsCount.plus(ONE);
  dayData.burnsCount = dayData.burnsCount.plus(ONE);
  dayData.save();

  let walletDayData = getWalletDayData(wallet, event);
  walletDayData.eventsCount = walletDayData.eventsCount.plus(ONE);
  walletDayData.totalTransactionFee = walletDayData.totalTransactionFee.plus(burn.txFee);
  walletDayData.avgTransactionFee = walletDayData.totalTransactionFee.div(wallet.transactionsCount.toBigDecimal());
  
  walletDayData.save();
}

function getTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let tokenDayID = token.id
    .toString()
    .concat("-")
    .concat(dayID.toString());

  let tokenDayData = TokenDayData.load(tokenDayID);
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID);
    tokenDayData.date = dayStartTimestamp;
    tokenDayData.token = token.id;

    tokenDayData.volume = ZERO_BD;
    tokenDayData.eventsCount = ZERO;
    tokenDayData.locksCount = ZERO;
    tokenDayData.unlocksCount = ZERO;

    tokenDayData.totalLocked = token.totalLocked;
    tokenDayData.save();
  }

  return tokenDayData as TokenDayData;
}

export function createTokenLock<T extends ILocked>(
  token: Token,
  manager: Manager,
  event: T
): void {
  let wallet = getWallet(Address.fromString(manager.wallet));

  let user = getUser(event.params.recipient, wallet, event);
  let lock = new Lock(
    event.transaction.hash
      .toHexString()
      .concat("-")
      .concat(event.logIndex.toString())
  );
  lock.contract = event.address;
  lock.type = "LOCK";
  lock.asset = token.id;
  lock.token = token.id;
  lock.manager = manager.id;
  lock.user = user.id;
  lock.amount = event.params.amount.toBigDecimal();
  lock.recipient = event.params.recipient;
  lock.sender = event.params.sender;
  lock.timestamp = event.block.timestamp;
  lock.blockNumber = event.block.number;
  lock.txIndex = event.transaction.index;
  lock.txHash = event.transaction.hash;
  lock.txFee = event.transaction.gasPrice.times(event.transaction.gasUsed)
  .toBigDecimal().div(ETH_WEI);
  lock.save();

  token.eventsCount = token.eventsCount.plus(ONE);
  token.locksCount = token.locksCount.plus(ONE);
  token.totalLocked = token.totalLocked.plus(lock.amount);
  token.volume = token.volume.plus(lock.amount);
  token.save();

  manager.eventsCount = manager.eventsCount.plus(ONE);
  manager.locksCount = manager.locksCount.plus(ONE);
  manager.save();

  user.eventsCount = user.eventsCount.plus(ONE);
  user.locksCount = user.locksCount.plus(ONE);
  user.save();

  wallet.eventsCount = wallet.eventsCount.plus(ONE);
  wallet.totalTransactionFee = wallet.totalTransactionFee.plus(lock.txFee);
  wallet.avgTransactionFee = wallet.avgTransactionFee.plus(lock.txFee).div(wallet.transactionsCount.toBigDecimal());
  wallet.save();

  let dayData = getTokenDayData(token, event);
  dayData.volume = dayData.volume.plus(lock.amount);
  dayData.totalLocked = token.totalLocked;
  dayData.eventsCount = dayData.eventsCount.plus(ONE);
  dayData.locksCount = dayData.locksCount.plus(ONE);
  dayData.save();

  let walletDayData = getWalletDayData(wallet, event);
  walletDayData.eventsCount = walletDayData.eventsCount.plus(ONE);
  walletDayData.save();
}

export function createTokenUnlock<T extends IUnlocked>(
  token: Token,
  manager: Manager,
  event: T
): void {
  let wallet = getWallet(Address.fromString(manager.wallet));

  let user = getUser(event.params.recipient, wallet, event);
  let unlock = new Unlock(
    event.transaction.hash
      .toHexString()
      .concat("-")
      .concat(event.logIndex.toString())
  );
  unlock.contract = event.address;
  unlock.type = "UNLOCK";
  unlock.asset = token.id;
  unlock.token = token.id;
  unlock.manager = manager.id;
  unlock.user = user.id;
  unlock.amount = event.params.amount.toBigDecimal();
  unlock.recipient = event.params.recipient;
  unlock.receiptId = event.params.receiptId;
  unlock.timestamp = event.block.timestamp;
  unlock.blockNumber = event.block.number;
  unlock.txIndex = event.transaction.index;
  unlock.txHash = event.transaction.hash;
  unlock.save();

  token.eventsCount = token.eventsCount.plus(ONE);
  token.unlocksCount = token.unlocksCount.plus(ONE);
  token.totalLocked = token.totalLocked.minus(unlock.amount);
  token.volume = token.volume.plus(unlock.amount);
  token.save();

  manager.eventsCount = manager.eventsCount.plus(ONE);
  manager.unlocksCount = manager.unlocksCount.plus(ONE);
  manager.save();

  user.eventsCount = user.eventsCount.plus(ONE);
  user.unlocksCount = user.unlocksCount.plus(ONE);
  user.save();

  wallet.eventsCount = wallet.eventsCount.plus(ONE);
  wallet.save();

  let dayData = getTokenDayData(token, event);
  dayData.volume = dayData.volume.plus(unlock.amount);
  dayData.totalLocked = token.totalLocked;
  dayData.eventsCount = dayData.eventsCount.plus(ONE);
  dayData.unlocksCount = dayData.unlocksCount.plus(ONE);
  dayData.save();

  let walletDayData = getWalletDayData(wallet, event);
  walletDayData.eventsCount = walletDayData.eventsCount.plus(ONE);
  walletDayData.save();
}
