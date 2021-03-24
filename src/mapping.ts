import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  Contract,
  AdminDistributeReward,
  // OwnershipTransferred,
  // Pause,
  // StakBankConfigurationChanged,
  // Unpause,
  UserStaked,
  UserUnstakedAll,
  UserUnstakedWithId,
  UserWithdrawedReward
} from "../generated/Contract/Contract"
import { Transaction, Stake, User } from "../generated/schema"

//An effort to prevent the "duplicate of code" but fail
//If there is a solution please tell me :D

// function storeTransaction(
//   event: UserStaked | UserUnstakedWithId | UserUnstakedAll | UserWithdrawedReward,
//   type : string) : void 
// {    
//   let trans = new Transaction(event.transaction.hash.toHex());

//   let user : Bytes;
//   let requestId : BigInt;
//   let amount : BigInt;
//   let ethReward : BigInt;
//   let usdtReward : BigInt;

//   if (event instanceof UserStaked) {
//     requestId = event.params.requestId;
//     amount = event.params.amount;
//   }
//   if (event instanceof UserUnstakedWithId) {
//     requestId = event.params.requestId;
//     ethReward = event.params.ethReward;
//     usdtReward = event.params.usdtReward;
//   }
//   if (event instanceof UserWithdrawedReward) {
//     ethReward = event.params.ethReward; 
//     usdtReward = event.params.usdtReward;
//   }
//   user = event.params.user;

//   trans.stake_id = requestId;
//   trans.type = type;
//   trans.purchaser = user;
//   trans.beneficiary = user;
//   trans.amount = amount;
//   trans.eth_reward = ethReward;
//   trans.usdt_reward = usdtReward;
//   trans.transaction_hash = event.transaction.hash;

//   trans.save();
// }

export function handleAdminDistributeReward(
  event: AdminDistributeReward
): void {
  //Create transaction   
  let trans = new Transaction(tx_hash);

  trans.stake_id = stake_id;
  trans.type = "stake";
  trans.purchaser = user;
  trans.beneficiary = user;
  trans.amount = amount;
  trans.transaction_hash = tx_hash;

  trans.save();
}

//An destruction and do interface are made but wont work
//code is such banana :D
export function handleUserStaked(event: UserStaked): void {  
  //Prepare params
  const data = event.params;

  const tx_hash = event.transaction.hash.toHex();
  const stake_id = data.requestId;
  const user = data.user;
  const stake_time = data.timestamp;
  const amount = data.amount;

  //Stake is create with the id matched with requestId on SC
  let stake = new Stake(stake_id.toHex());

  stake.stake_id = stake_id;
  stake.user = user;
  stake.is_unstaked = false;
  stake.stake_time = stake_time;
  stake.amount = amount;
  
  stake.save();

  //Create transaction   
  //Id of a trans is taken with the transaction hash
  let trans = new Transaction(tx_hash);

  trans.stake_id = stake_id;
  trans.type = "stake";
  trans.purchaser = user;
  trans.beneficiary = user;
  trans.amount = amount;
  trans.transaction_hash = tx_hash;

  trans.save();
}

export function handleUserUnstakedAll(event: UserUnstakedAll): void {
  // const id = event.params.user.toHex();

  // const user = U
}

export function handleUserUnstakedWithId(event: UserUnstakedWithId): void { 
  //Create stake
  const tx_hash = event.transaction.hash.toHex();

  const data = event.params;
  const requestId = data.requestId;
  const user = data.user;
  const ethReward = data.ethReward;
  const usdtReward = data.usdtReward;

  let stake = Stake.load(requestId.toHex());

  if(!stake){
    stake = new Stake(requestId.toHex());

    stake.stake_id = requestId;
    stake.user = user;
    stake.eth_reward = ethReward;
    stake.usdt_reward = usdtReward;
  }

  stake.is_unstaked = true;
  stake.save();

  //Create transaction   
  let trans = new Transaction(tx_hash);

  trans.stake_id = requestId;
  trans.type = "stake";
  trans.purchaser = user;
  trans.beneficiary = user;
  trans.eth_reward = ethReward;
  trans.usdt_reward = ethReward;
  trans.transaction_hash = tx_hash;

  trans.save();
}

export function handleUserWithdrawedReward(event: UserWithdrawedReward): void {
  const id = event.transaction.hash.toHex();

  let trans = new Transaction(id);

  trans.type = "claim_reward";
  trans.eth_reward = event.params.ethReward;
  trans.usdt_reward = event.params.usdtReward;
  trans.transaction_hash = id;

  trans.save();
}

// export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

// export function handlePause(event: Pause): void {}

// export function handleStakBankConfigurationChanged(
//   event: StakBankConfigurationChanged
// ): void {}

// export function handleUnpause(event: Unpause): void {}

// export function handleAdminDistributeReward(
//   event: AdminDistributeReward
// ): void {
//   const trans = new ethereum.Transaction();
//   trans.hash()
//   // Entities can be loaded from the store using a string ID; this ID
//   // needs to be unique across all entities of the same type
//   let entity = ExampleEntity.load(event.transaction.from.toHex())

//   // Entities only exist after they have been saved to the store;
//   // `null` checks allow to create entities on demand
//   if (entity == null) {
//     entity = new ExampleEntity(event.transaction.from.toHex())

//     // Entity fields can be set using simple assignments
//     entity.count = BigInt.fromI32(0)
//   }

//   // BigInt and BigDecimal math are supported
//   entity.count = entity.count + BigInt.fromI32(1)

//   // Entity fields can be set based on event parameters
//   entity.ethToReward = event.params.ethToReward
//   entity.usdtToReward = event.params.usdtToReward

//   // Entities can be written to the store with `.save()`
//   entity.save()

//   // Note: If a handler doesn't require existing field values, it is faster
//   // _not_ to load the entity from the store. Instead, create it fresh with
//   // `new Entity(...)`, set the fields that should be updated and save the
//   // entity back to the store. Fields that were not set or unset remain
//   // unchanged, allowing for partial updates to be applied.

//   // It is also possible to access smart contracts from mappings. For
//   // example, the contract that has emitted the event can be connected to
//   // with:
//   //
//   // let contract = Contract.bind(event.address)
//   //
//   // The following functions can then be called on this contract to access
//   // state variables and other data:
//   //
//   // - contract.checkDetailStakingRequest(...)
//   // - contract.countdownToNextDistribution(...)
//   // - contract.decimal(...)
//   // - contract.estimateNextDistribution(...)
//   // - contract.feeCalculator(...)
//   // - contract.feePerDecimal(...)
//   // - contract.lastDis(...)
//   // - contract.minAmountToStake(...)
//   // - contract.numEthToReward(...)
//   // - contract.numUsdtToReward(...)
//   // - contract.numberDistribution(...)
//   // - contract.numberOfStakeHolder(...)
//   // - contract.owner(...)
//   // - contract.paused(...)
//   // - contract.periodTime(...)
//   // - contract.stakingOf(...)
//   // - contract.token(...)
//   // - contract.totalStaked(...)
//   // - contract.usdt(...)
// }