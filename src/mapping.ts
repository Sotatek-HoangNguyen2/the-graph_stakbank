import { BigInt, Bytes, ethereum, store } from "@graphprotocol/graph-ts"
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
  UserWithdrawedReward,
  StakeCall__Inputs
} from "../generated/Contract/Contract"
import { Transaction, Stake, User, Log, UnstakeHistory } from "../generated/schema"

export function handleAdminDistributeReward(
  event: AdminDistributeReward
): void {
  const tx_hash = event.transaction.hash.toHex();
  //Create transaction   
  let trans = new Transaction(tx_hash);

  trans.type = "distribute";
  trans.transaction_hash = tx_hash;

  trans.save();
}

//An destruction and do interface are made but wont work
//code is such banana :D
export function handleUserStaked(event: UserStaked): void {  
  //Prepare params
  const data = event.params;

  const tx_hash = event.transaction.hash.toHex(); //Bytes to String
  const requestId = data.requestId;
  const user_address = data.user.toHex();
  const stake_time = data.timestamp;
  const amount = data.amount;

  //StakeId is create with the "user_address + stake_id"
  //As stake_id is count from 1 for each user, taking it only
  //representation for  id of StakeEntity is not possible
  const stake_entity_id = requestId.toString() + "_" + user_address;
  let stake = new Stake(stake_entity_id);

  stake.stake_id = requestId;
  stake.user = user_address;
  stake.is_unstaked = false;
  stake.stake_time = stake_time;
  stake.amount = amount;
  
  stake.save();

  //Check user
  let user = User.load(user_address);
  if(user == null){
    user = new User(user_address);
    user.address = user_address; 
    user.stakes = [stake_entity_id];      
  }else{
    const mirrorStakes = user.stakes;
    mirrorStakes.push(stake_entity_id);
    user.stakes = mirrorStakes;
  }
  user.save(); 

  //Create transaction   
  //Id of a trans is taken with the transaction hash
  let trans = new Transaction(tx_hash);

  trans.stake_id = requestId;
  trans.type = "stake";
  trans.purchaser = user_address;
  trans.beneficiary = user_address;
  trans.amount = amount;
  trans.transaction_hash = tx_hash;

  trans.save();
}

export function handleUserUnstakedWithId(event: UserUnstakedWithId): void { 
  //Preapre params
  const data = event.params;
  const requestId = data.requestId;
  const user_address = data.user.toHex();
  const ethReward = data.ethReward;
  const usdtReward = data.usdtReward;

  //Check if stake is null from DB
  //if yes, create a new stake
  const stake_entity_id = requestId.toString() + "_" + user_address;

  let stake = Stake.load(stake_entity_id);
  
  historify(stake, 'UNSTAKE');
  //Remove the "removed" stake from the user's stake list
  const user = User.load(user_address);

  let mirrorStakes = user.stakes;
  let idxToRemove = mirrorStakes.indexOf(stake_entity_id);
  // only remove if the revokedSender exists
  if (idxToRemove > -1) {
    mirrorStakes.splice(idxToRemove, 1);
    user.stakes = mirrorStakes
    user.save()
  }else{
    log('FAIL', "Remove stake_entity_id fails", "UNSTAKE");
  }

  //Create transaction   
  const tx_hash = event.transaction.hash.toHex();
  let trans = new Transaction(tx_hash);

  trans.stake_id = requestId;
  trans.type = "unstake";
  trans.purchaser = user_address;
  trans.beneficiary = user_address;
  trans.eth_reward = ethReward;
  trans.usdt_reward = ethReward;
  trans.transaction_hash = tx_hash;

  trans.save();
}

export function handleUserUnstakedAll(event: UserUnstakedAll): void {
  const user_address = event.params.user.toHex();
  const user = User.load(user_address);
  const stakes = user.stakes;

  stakes.forEach(stake_entity_id => {    
    const stake = Stake.load(stake_entity_id);
    
    historify(stake, 'UNSTAKE_ALL');
  });

  //Clean stakes record
  user.stakes = [];
  user.save();

  //Create transaction   
  //Id of a trans is taken with the transaction hash
  const tx_hash = event.transaction.hash.toHex();
  let trans = new Transaction(tx_hash);

  trans.type = "unstake_all";
  trans.purchaser = user_address;
  trans.beneficiary = user_address;
  trans.transaction_hash = tx_hash;

  trans.save();
}

export function handleUserWithdrawedReward(event: UserWithdrawedReward): void {
  const tx_hash = event.transaction.hash.toHex();

  let trans = new Transaction(tx_hash);

  trans.type = "claim_reward";
  trans.eth_reward = event.params.ethReward;
  trans.usdt_reward = event.params.usdtReward;
  trans.transaction_hash = tx_hash;

  trans.save();
}

//This function is used to store a record into log table
//as sub-graph at the moment can not log
function log(id : string, message : string, func : string):void{
  const log = new Log(id);
  log.message = message;
  log.func = func;
  log.save();
}

//Delete a record in the Stake table and save it to UnstakeHistory table
function historify(father : Stake | null, processor : string): void{

  if(father == null){
    log('ERROR', 'FATHER IS NULL', processor);
  }else{
    let son_id : string;
    son_id = father.id + father.stake_time.toString();
    
    const son = new UnstakeHistory(son_id);

    son.stake_id = father.stake_id;
    son.user = father.user;
    son.is_unstaked = true;
    son.stake_time = father.stake_time;
    son.amount = father.amount;
    son.eth_reward = father.eth_reward;
    son.usdt_reward = father.usdt_reward;

    log('REMOVE', 'Removing stake: ' + father.id, 'historify');
    store.remove('Stake', father.id); //Can not remove (ISSUE)
    son.save();
  }  
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