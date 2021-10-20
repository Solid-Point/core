import { BigNumber, Contract, ContractTransaction, Wallet } from "ethers";
import PoolABI from "../abi/pool.json";
import TokenABI from "../abi/token.json";
import logger from "../utils/logger";

const Token = async (pool: Contract): Promise<Contract> => {
  return new Contract((await pool._token()) as string, TokenABI, pool.signer);
};

const Pool = (address: string, wallet: Wallet): Contract => {
  return new Contract(address, PoolABI, wallet);
};

export const decimals = BigNumber.from(10).pow(18);

export const stake = async (
  stake: number,
  pool: Contract,
  settings: any
): Promise<void> => {
  const stakeLogger = logger.getChildLogger({
    name: "Stake",
  });

  const address = await pool.signer.getAddress();
  const token = await Token(pool);

  const parsedStake = BigNumber.from(stake).mul(decimals);
  const currentStake = (await pool._stakingAmounts(address)) as BigNumber;
  const minimumStake = settings._minimumStake as BigNumber;

  if (parsedStake.lt(minimumStake)) {
    stakeLogger.warn(
      `⚠️  Minimum stake is ${minimumStake
        .div(decimals)
        .toString()} $KYVE. You will not be able to register / vote.`
    );
  }

  if (currentStake.gt(parsedStake)) {
    // Need to unstake the difference.
    const diff = currentStake.sub(parsedStake);
    stakeLogger.debug(
      `Attempting to unstake ${diff.div(decimals).toString()} $KYVE.`
    );

    try {
      const transaction = (await pool.unstake(diff, {
        gasLimit: await pool.estimateGas.unstake(diff),
      })) as ContractTransaction;
      stakeLogger.debug(
        `Unstaking ${diff.div(decimals).toString()} $KYVE. Transaction = ${
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
    const diff = parsedStake.sub(currentStake);
    stakeLogger.debug(
      `Attempting to stake ${diff.div(decimals).toString()} $KYVE.`
    );

    const balance = (await token.balanceOf(address)) as BigNumber;
    if (balance.lt(diff)) {
      stakeLogger.error(
        "❌ Supplied wallet does not have enough $KYVE to stake."
      );
      process.exit(1);
    } else {
      try {
        let transaction: ContractTransaction;

        transaction = await token.approve(pool.address, diff, {
          gasLimit: await token.estimateGas.approve(pool.address, diff),
        });
        stakeLogger.debug(
          `Approving ${diff
            .div(decimals)
            .toString()} $KYVE to be spent. Transaction = ${transaction.hash}`
        );

        await transaction.wait();
        stakeLogger.info("👍 Successfully approved.");

        transaction = await pool.stake(diff, {
          gasLimit: await pool.estimateGas.stake(diff),
        });
        stakeLogger.debug(
          `Staking ${diff.div(decimals).toString()} $KYVE. Transaction = ${
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

export const unstakeAll = async (pool: Contract): Promise<void> => {
  const unstakeLogger = logger.getChildLogger({
    name: "Unstake",
  });

  const address = await pool.signer.getAddress();
  const currentStake = (await pool._stakingAmounts(address)) as BigNumber;

  if (currentStake.gt(0)) {
    unstakeLogger.debug(
      `Attempting to unstake ${currentStake.div(decimals).toString()} $KYVE.`
    );

    try {
      const transaction = (await pool.unstake(currentStake, {
        gasLimit: await pool.estimateGas.unstake(currentStake),
      })) as ContractTransaction;
      unstakeLogger.debug(
        `Unstaking ${currentStake
          .div(decimals)
          .toString()} $KYVE. Transaction = ${transaction.hash}`
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
