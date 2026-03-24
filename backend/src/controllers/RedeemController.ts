import { type Request, type Response } from "express";
import { UniswapService } from "../services/UniswapService";
import { SwapService, UNIVERSAL_ROUTER_ADDRESSES } from "../services/SwapService";
import { AgentService } from "../services/AgentService";
import { type Address, parseUnits, encodeFunctionData, parseAbi } from "viem";

const uniswapService = new UniswapService();
const swapService = new SwapService();
const agentService = new AgentService();

const ERC20_ABI = parseAbi([
  "function deposit() payable",
  "function approve(address spender, uint256 amount) returns (bool)"
]);

const PERMIT2_ABI = parseAbi([
  "function approve(address token, address spender, uint160 amount, uint48 expiration)"
]);

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;

const TOKEN_MAPPING: Record<string, Record<string, Address>> = {
  baseSepolia: {
    WETH: "0x4200000000000000000000000000000000000006",
    ETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    ETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  celo: {
    WETH: "0x471EcE3750Da237f93B8E33EcC305983348713B2",
    ETH: "0x471EcE3750Da237f93B8E33EcC305983348713B2",
    USDC: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  },
  celoSepolia: {
    WETH: "0x471EcE3750Da237f93B8E33EcC305983348713B2",
    ETH: "0x471EcE3750Da237f93B8E33EcC305983348713B2",
    USDC: "0x6289624022AF351f9d07340c79567c60322c148B",
  }
};

function resolveTokenAddress(chain: string, token: string): Address {
  if (token.startsWith("0x") && token.length === 42) {
    return token as Address;
  }
  
  const chainTokens = TOKEN_MAPPING[chain];
  if (!chainTokens) {
    throw new Error(`Chain ${chain} not supported for symbol resolution`);
  }

  const address = chainTokens[token.toUpperCase()];
  if (!address) {
    throw new Error(`Token symbol ${token} not found for chain ${chain}. Please provide hex address.`);
  }

  return address;
}

export const redeemSwap = async (req: Request, res: Response) => {
  const { 
    chain, 
    tokenIn: rawTokenIn, 
    tokenOut: rawTokenOut, 
    amountIn, 
    decimalsIn, 
    fee, 
    delegation, // The signed delegation object from the frontend
    delegator // The user's address
  } = req.body;

  if (!chain || !rawTokenIn || !rawTokenOut || !amountIn || !decimalsIn || !delegation || !delegator) {
    return res.status(400).json({ error: "Missing required body parameters" });
  }

  // STRICT TESTNET ONLY CHECK
  const allowedTestnets = ["baseSepolia", "celoSepolia"];
  if (!allowedTestnets.includes(chain as string)) {
    return res.status(403).json({ 
        success: false, 
        error: `Action Forbidden: The current environment is locked to TESTNETS ONLY (Base Sepolia, Celo Sepolia). Chain '${chain}' is not allowed.` 
    });
  }

  try {
    console.log(`\n📥 [RedeemController] New swap request received for ${chain}`);
    console.log(`👉 Delegator: ${delegator}`);
    
    const tokenIn = resolveTokenAddress(chain, rawTokenIn);
    const tokenOut = resolveTokenAddress(chain, rawTokenOut);
    
    console.log(`🔍 Resolved tokens: ${rawTokenIn} -> ${tokenIn}, ${rawTokenOut} -> ${tokenOut}`);

    const amountInBigInt = parseUnits(amountIn as string, Number(decimalsIn));

    // 1. Get the current quote to determine amountOutMinimum (e.g., 0.5% slippage)
    console.log("📈 Fetching Uniswap quote...");
    const quote = await uniswapService.getQuote({
      chain: (chain as "base" | "celo" | "baseSepolia" | "celoSepolia"),
      tokenIn: tokenIn as Address,
      tokenOut: tokenOut as Address,
      amountIn: amountInBigInt,
      fee: fee ? Number(fee) : 3000,
    });

    console.log(`✅ Quote received: Expected ${quote.amountOut} output tokens`);

    const amountOutMinimum = 0n; // 100% slippage tolerance to guarantee testnet swap success

    // 2. Generate the Uniswap execution calldata
    const executionCallData = await swapService.getSwapCallData({
      tokenIn: tokenIn as Address,
      tokenOut: tokenOut as Address,
      fee: fee ? Number(fee) : 3000,
      recipient: delegator as Address, // Swap back to the user's address
      amountIn: amountInBigInt,
      amountOutMinimum,
    });

    // 3. Prepare the atomic execution sequence for the DelegationManager
    console.log("🛠 Preparing execution batch (Wrap -> Approve -> Swap)...");
    const routerAddress = UNIVERSAL_ROUTER_ADDRESSES[chain as "base" | "celo" | "baseSepolia" | "celoSepolia"];
    const executions: any[] = [];

    // Check if the token is WETH to automatically wrap native ETH
    const wethAddresses = [
      "0x4200000000000000000000000000000000000006", // Base / Base Sepolia WETH
    ];
    const isWeth = wethAddresses.includes((tokenIn as string).toLowerCase());

    if (isWeth) {
      executions.push({
        target: tokenIn as Address,
        value: amountInBigInt, // Send native ETH from the userSA to wrap it
        callData: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "deposit"
        })
      });
    }

    // Approve Permit2 to spend the ERC20 token
    executions.push({
      target: tokenIn as Address,
      value: 0n,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PERMIT2_ADDRESS, (2n ** 256n) - 1n] // Safely max out allowance to Permit2
      })
    });

    // Approve the Universal Router within Permit2
    executions.push({
      target: PERMIT2_ADDRESS,
      value: 0n,
      callData: encodeFunctionData({
        abi: PERMIT2_ABI,
        functionName: "approve",
        args: [
          tokenIn as Address,
          routerAddress,
          (2n ** 160n) - 1n, // Max uint160 allowance for guaranteed routing
          281474976710655    // Max uint48 expiration (prevents testnet node drift reverts)
        ]
      })
    });

    // Execute the Swap on the Universal Router
    executions.push({
      target: routerAddress,
      value: 0n,
      callData: executionCallData,
    });

    // 4. Properly format the delegation (convert string salt back to BigInt)
    const formattedDelegation = {
      ...delegation,
      salt: BigInt(delegation.salt),
      caveats: delegation.caveats.map((c: any) => ({
        enforcer: c.enforcer as Address,
        terms: c.terms as `0x${string}`,
        args: (c.args || "0x") as `0x${string}`,
      })),
    };

    // --- ISOLATION DEBUGGING ---
    // Change to executions.slice(0, 1) to test ONLY WETH Wrap
    // Change to executions.slice(0, 3) to test Wrap + Approvals
    const debugExecutions = executions; // Restore full test run!

    // 5. Redeem the delegation and broadcast the transaction
    console.log("🚀 Requesting Agent to redeem delegation and broadcast...");
    const result = await agentService.redeemDelegation({
      chain: (chain as "base" | "celo" | "baseSepolia" | "celoSepolia"),
      delegations: [formattedDelegation],
      executions: debugExecutions,
    });

    console.log(`✅ [RedeemController] Swap execution successful: ${result.transactionHash}`);

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      quote: {
        expectedAmountOut: quote.amountOut.toString(),
        amountOutMinimum: amountOutMinimum.toString(),
      }
    });
  } catch (error: any) {
    console.error("Redeem swap failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
