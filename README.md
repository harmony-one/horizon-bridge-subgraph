# Horizon Bridge Subgraph

## Prerequisites
* Run graph node locally using `docker-compore up` or point to `https://graph.t.hmny.io:8020/` as described in [docs.harmony.one](https://docs.harmony.one/home/developers/tools/the-graph)
* `yarn create-local` or `npm run create-local`
* `yarn deploy-local` or `npm run deploy-local`

This subgraph dynamically tracks assets and events

- aggregated data across managers, assets and wallets
- data on individual assets
- data on transactions
- data on managers
- data on wallets

## Queries

Below are a few ways to show how to query the horizon-bridge-subgraph for data. The queries show most of the information that is queryable, but there are many other filtering options that can be used, just check out the [querying api](https://thegraph.com/docs/graphql-api). These queries can be used locally or in The Graph Explorer playground.

## Interface Overviews

### Asset

```graphql
interface Asset {
  id: ID!
  network: Network!
  manager: Manager
  symbol: String!
  name: String!

  address: Bytes!
  mappedAddress: Bytes

  events: [Event!]! @derivedFrom(field: "asset")
  eventsCount: BigInt!
}
```

### Event

```graphql
enum EventType {
  LOCK
  UNLOCK
  MINT
  BURN

  NFT_MINT
  NFT_BURN

  SUBMISSION
  CONFIRMATION
  EXECUTION
  EXECUTION_FAILED

  WITHDRAW
}

interface Event {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!
}
```

## Key Entity Overviews

#### Manager

```graphql
type Manager @entity {
  id: ID!
  wallet: Wallet!

  assets: [Asset!]! @derivedFrom(field: "manager")

  events: [Event!]! @derivedFrom(field: "manager")
  eventsCount: BigInt!

  locks: [Lock!]! @derivedFrom(field: "manager")
  locksCount: BigInt!
  unlocks: [Unlock!]! @derivedFrom(field: "manager")
  unlocksCount: BigInt!

  mints: [Mint!]! @derivedFrom(field: "manager")
  mintsCount: BigInt!
  burns: [Burn!]! @derivedFrom(field: "manager")
  burnsCount: BigInt!

  nftMints: [NFTMint!]! @derivedFrom(field: "manager")
  nftMintsCount: BigInt!
  nftBurns: [NFTBurn!]! @derivedFrom(field: "manager")
  nftBurnsCount: BigInt!
}
```

#### Wallet

```graphql
type Wallet @entity {
  id: ID!
  managers: [Manager!]! @derivedFrom(field: "wallet")

  transactions: [Transaction!]! @derivedFrom(field: "wallet")
  transactionsCount: BigInt!
  transactionsConfirmedCount: BigInt!
  transactionsExecutedCount: BigInt!

  events: [WalletEvent!]! @derivedFrom(field: "wallet")
}
```

#### Transaction

```graphql
type Transaction @entity {
  id: ID!
  wallet: Wallet!
  destination: String!
  value: BigInt!
  data: Bytes!
  submittedBy: String!

  events: [WalletEvent!]! @derivedFrom(field: "transaction")

  confirmations: [Confirmation!]! @derivedFrom(field: "transaction")
  confirmationsCount: BigInt!
  confirmationsRequired: BigInt!
  confirmed: Boolean!

  executed: Boolean!
  execution: Execution
  executions: [Execution!]! @derivedFrom(field: "transaction")

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: String!

  manager: Manager
}
type Confirmation @entity {
  id: ID!
  transaction: Transaction!
  sender: String!
  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: String!
}

enum ExecutionStatus {
  SUCCESS
  FAILURE
}

type Execution @entity {
  id: ID!
  status: ExecutionStatus!
  sender: String!
  transaction: Transaction!
  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: String!
}
```

### WalletEvent

```graphql
type WalletEvent implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  wallet: Wallet!
  transaction: Transaction!
}
```

#### Token

ONE and HRC20 Tokens

```graphql
type Token implements Asset @entity {
  id: ID!
  network: Network!
  manager: Manager
  symbol: String!
  name: String!

  address: Bytes!
  mappedAddress: Bytes

  events: [Event!]! @derivedFrom(field: "asset")
  eventsCount: BigInt!

  decimals: BigInt!

  locks: [Lock!]! @derivedFrom(field: "token")
  locksCount: BigInt!
  unlocks: [Unlock!]! @derivedFrom(field: "token")
  unlocksCount: BigInt!

  totalLocked: BigInt!
}
```

#### Lock, Unlock

```graphql
type Lock implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  token: Token!

  sender: Bytes!
  recipient: Bytes!
  amount: BigInt!
}

type Unlock implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  token: Token!

  recipient: Bytes!
  receiptId: Bytes!
  amount: BigInt!
}
```

#### BridgedToken

ERC20, BEP20, LINK, BUSD Tokens

```graphql
type BridgedToken implements Asset @entity {
  id: ID!
  network: Network!
  manager: Manager
  symbol: String!
  name: String!

  address: Bytes!
  mappedAddress: Bytes

  events: [Event!]! @derivedFrom(field: "asset")
  eventsCount: BigInt!

  decimals: BigInt!

  mints: [Mint!]! @derivedFrom(field: "token")
  mintsCount: BigInt!
  burns: [Burn!]! @derivedFrom(field: "token")
  burnsCount: BigInt!

  totalLocked: BigInt!
}
```

#### Mint, Burn

```graphql
type Mint implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  token: BridgedToken!

  recipient: Bytes!
  receiptId: Bytes!
  amount: BigInt!
}

type Burn implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  token: BridgedToken!

  sender: Bytes!
  recipient: Bytes!
  amount: BigInt!
}
```

#### BridgedNFT

ERC721

```graphql
type BridgedNFT implements Asset @entity {
  id: ID!
  network: Network!
  manager: Manager
  symbol: String!
  name: String!

  address: Bytes!
  mappedAddress: Bytes

  events: [Event!]! @derivedFrom(field: "asset")
  eventsCount: BigInt!

  mints: [NFTMint!]! @derivedFrom(field: "token")
  mintsCount: BigInt!
  burns: [NFTBurn!]! @derivedFrom(field: "token")
  burnsCount: BigInt!

  inventory: [BigInt!]!
}
```

#### NFTMint, NFTBurn implements Event

```graphql
type NFTMint implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  token: BridgedNFT!

  recipient: Bytes!
  receiptId: Bytes!
  tokenId: BigInt!
}

type NFTBurn implements Event @entity {
  id: ID!
  type: EventType!

  manager: Manager
  asset: Asset
  user: User

  timestamp: BigInt!
  blockNumber: BigInt!
  txIndex: BigInt!
  txHash: Bytes!

  token: BridgedNFT!

  sender: Bytes!
  recipient: Bytes!
  tokenId: BigInt!
}
```

## Example Queries

### Querying all Assets

```graphql
{
  assets(orderBy: eventsCount, orderDirection: desc) {
    id
    symbol
    network
    address
    mappedAddress
    eventsCount
    ... on Token {
      locksCount
      unlocksCount
      totalLocked
    }
    ... on BridgedToken {
      mintsCount
      burnsCount
      totalLocked
    }
    ... on BridgedNFT {
      mintsCount
      burnsCount
      inventory
    }
  }
}
```

### Querying all Events

```graphql
{
  events(orderBy: timestamp, orderDirection: desc) {
    id
    type
    asset {
      address
      symbol
    }
    ... on WalletEvent {
      transaction {
        destination
        value
        data
      }
    }
    ... on Lock {
      amount
      recipient
      sender
    }
    ... on Unlock {
      amount
      recipient
      receiptId
    }
    ... on Mint {
      amount
      recipient
      receiptId
    }
    ... on Burn {
      amount
      recipient
      sender
    }
    ... on NFTMint {
      tokenId
      recipient
      receiptId
    }
    ... on NFTBurn {
      tokenId
      recipient
      sender
    }
  }
}
```
