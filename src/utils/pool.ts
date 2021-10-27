import { BigNumber } from "bignumber.js";
import { Contract, ContractTransaction, ethers, Wallet } from "ethers";
import PoolABI from "../abi/pool.json";
import TokenABI from "../abi/token.json";
import logger from "../utils/logger";

const Token = async (pool: Contract): Promise<Contract> => {
  return new Contract((await pool.token()) as string, TokenABI, pool.signer);
};

const Pool = (address: string, wallet: Wallet): Contract => {
  return new Contract(address, PoolABI, wallet);
};

export const toHumanReadable = (amount: BigNumber) => {
  return amount.dividedBy(new BigNumber(10).exponentiatedBy(18)).toFixed(5);
};

export const toEthersBN = (amount: BigNumber) => {
  return ethers.BigNumber.from(amount.toFixed());
};

export const toBN = (amount: ethers.BigNumber) => {
  return new BigNumber(amount.toString());
};

export const getGasPrice = async (pool: Contract, gasMultiplier: string) => {
  return toEthersBN(
    toBN(await pool.provider.getGasPrice()).multipliedBy(gasMultiplier)
  );
};

export const stake = async (
  stake: string,
  pool: Contract,
  settings: any,
  gasMultiplier: string
): Promise<void> => {
  const stakeLogger = logger.getChildLogger({
    name: "Stake",
  });

  const address = await pool.signer.getAddress();
  const token = await Token(pool);

  let parsedStake: BigNumber;

  try {
    parsedStake = new BigNumber(stake).multipliedBy(
      new BigNumber(10).exponentiatedBy(18)
    );
  } catch (error) {
    stakeLogger.error("❌ Provided invalid staking amount:", error);
    process.exit(1);
  }

  const currentStake = new BigNumber(
    (await pool._stakingAmounts(address)).toString()
  );
  const minimumStake = toBN(settings._minimumStake as ethers.BigNumber);

  if (parsedStake.lt(minimumStake)) {
    stakeLogger.error(
      `❌ Minimum stake is ${toHumanReadable(
        minimumStake
      )} $KYVE. You will not be able to register / vote.`
    );
    process.exit();
  }

  if (currentStake.gt(parsedStake)) {
    // Need to unstake the difference.
    const diff = currentStake.minus(parsedStake);
    stakeLogger.debug(`Attempting to unstake ${toHumanReadable(diff)} $KYVE.`);

    try {
      const transaction = (await pool.unstake(toEthersBN(diff), {
        gasLimit: await pool.estimateGas.unstake(toEthersBN(diff)),
        gasPrice: await getGasPrice(pool, gasMultiplier),
      })) as ContractTransaction;
      stakeLogger.debug(
        `Unstaking ${toHumanReadable(diff)} $KYVE. Transaction = ${
          transaction.hash
        }`
      );

      await transaction.wait();
      stakeLogger.info("📉 Successfully unstaked.");
    } catch (error) {
      stakeLogger.error("❌ Received an error while trying to unstake:", error);
      process.exit(1);
    }
  } else if (currentStake.lt(parsedStake)) {
    // Need to stake the difference.
    const diff = parsedStake.minus(currentStake);
    stakeLogger.debug(`Attempting to stake ${toHumanReadable(diff)} $KYVE.`);

    const balance = toBN((await token.balanceOf(address)) as ethers.BigNumber);
    if (balance.lt(diff)) {
      stakeLogger.error(
        "❌ Supplied wallet does not have enough $KYVE to stake."
      );
      process.exit(1);
    } else {
      try {
        let transaction: ContractTransaction;

        transaction = await token.approve(pool.address, toEthersBN(diff), {
          gasLimit: await token.estimateGas.approve(
            pool.address,
            toEthersBN(diff)
          ),
          gasPrice: await getGasPrice(pool, gasMultiplier),
        });
        stakeLogger.debug(
          `Approving ${toHumanReadable(
            diff
          )} $KYVE to be spent. Transaction = ${transaction.hash}`
        );

        await transaction.wait();
        stakeLogger.info("👍 Successfully approved.");

        transaction = await pool.stake(toEthersBN(diff), {
          gasLimit: await pool.estimateGas.stake(toEthersBN(diff)),
          gasPrice: await getGasPrice(pool, gasMultiplier),
        });
        stakeLogger.debug(
          `Staking ${toHumanReadable(diff)} $KYVE. Transaction = ${
            transaction.hash
          }`
        );

        await transaction.wait();
        stakeLogger.info("📈 Successfully staked.");
      } catch (error) {
        stakeLogger.error("❌ Received an error while trying to stake:", error);
        process.exit(1);
      }
    }
  } else {
    // Already staked with the correct amount.
    stakeLogger.info("👌 Already staked with the correct amount.");
  }
};

export const unstakeAll = async (
  pool: Contract,
  gasMultiplier: string
): Promise<void> => {
  const unstakeLogger = logger.getChildLogger({
    name: "Unstake",
  });

  const address = await pool.signer.getAddress();
  const currentStake = new BigNumber(
    (await pool._stakingAmounts(address)).toString()
  );

  if (currentStake.gt(0)) {
    unstakeLogger.debug(
      `Attempting to unstake ${toHumanReadable(currentStake)} $KYVE.`
    );

    try {
      const transaction = (await pool.unstake(toEthersBN(currentStake), {
        gasLimit: await pool.estimateGas.unstake(toEthersBN(currentStake)),
        gasPrice: await getGasPrice(pool, gasMultiplier),
      })) as ContractTransaction;
      unstakeLogger.debug(
        `Unstaking ${toHumanReadable(currentStake)} $KYVE. Transaction = ${
          transaction.hash
        }`
      );

      await transaction.wait();
      unstakeLogger.info("📉 Successfully unstaked.");
    } catch (error) {
      unstakeLogger.error(
        "❌ Received an error while trying to unstake:",
        error
      );
      process.exit(1);
    }
  } else {
    unstakeLogger.debug("Nothing to unstake.");
  }
};

export default Pool;
